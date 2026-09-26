"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainSignModel = trainSignModel;
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function stratifiedSplit(data, labels, split, rand) {
    const train = [];
    const val = [];
    labels.forEach((label, y) => {
        const items = data.filter((d) => d.label === label);
        const toExample = (d) => ({
            x: Float64Array.from(d.vector),
            y,
            g: d.group,
        });
        const groups = new Map();
        for (const d of items) {
            const key = d.group ?? '';
            groups.set(key, [...(groups.get(key) ?? []), d]);
        }
        if (groups.size >= 2) {
            const target = items.length * split;
            let held = 0;
            const ordered = shuffle([...groups.values()], rand);
            ordered.forEach((g, i) => {
                const toVal = i < ordered.length - 1 &&
                    (held === 0 || held + g.length / 2 <= target);
                if (toVal)
                    held += g.length;
                for (const d of g)
                    (toVal ? val : train).push(toExample(d));
            });
            return;
        }
        const shuffled = shuffle(items, rand);
        const nVal = shuffled.length >= 4
            ? Math.max(1, Math.round(shuffled.length * split))
            : 0;
        shuffled.forEach((d, i) => (i < nVal ? val : train).push(toExample(d)));
    });
    return { train, val };
}
class Mlp {
    inputs;
    hidden;
    classes;
    w1;
    b1;
    w2;
    b2;
    m;
    v;
    t = 0;
    constructor(inputs, hidden, classes, rand) {
        this.inputs = inputs;
        this.hidden = hidden;
        this.classes = classes;
        const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) *
            Math.cos(2 * Math.PI * rand());
        this.w1 = Float64Array.from({ length: hidden * inputs }, () => gauss() * Math.sqrt(2 / inputs));
        this.b1 = new Float64Array(hidden);
        this.w2 = Float64Array.from({ length: classes * hidden }, () => gauss() * Math.sqrt(1 / hidden));
        this.b2 = new Float64Array(classes);
        const params = [this.w1, this.b1, this.w2, this.b2];
        this.m = params.map((p) => new Float64Array(p.length));
        this.v = params.map((p) => new Float64Array(p.length));
    }
    forward(x) {
        const { inputs, hidden, classes, w1, b1, w2, b2 } = this;
        const h = new Float64Array(hidden);
        for (let j = 0; j < hidden; j++) {
            let s = b1[j];
            const row = j * inputs;
            for (let i = 0; i < inputs; i++)
                s += w1[row + i] * x[i];
            h[j] = s > 0 ? s : 0;
        }
        const p = new Float64Array(classes);
        let max = -Infinity;
        for (let k = 0; k < classes; k++) {
            let s = b2[k];
            const row = k * hidden;
            for (let j = 0; j < hidden; j++)
                s += w2[row + j] * h[j];
            p[k] = s;
            if (s > max)
                max = s;
        }
        let sum = 0;
        for (let k = 0; k < classes; k++)
            sum += p[k] = Math.exp(p[k] - max);
        for (let k = 0; k < classes; k++)
            p[k] /= sum;
        return { h, p };
    }
    step(batch, lr, weightDecay) {
        const { inputs, hidden, classes } = this;
        const g = [this.w1, this.b1, this.w2, this.b2].map((p) => new Float64Array(p.length));
        const [gw1, gb1, gw2, gb2] = g;
        let loss = 0;
        for (const { x, y } of batch) {
            const { h, p } = this.forward(x);
            loss -= Math.log(p[y] + 1e-12);
            const dz2 = p;
            dz2[y] -= 1;
            const dh = new Float64Array(hidden);
            for (let k = 0; k < classes; k++) {
                const d = dz2[k];
                gb2[k] += d;
                const row = k * hidden;
                for (let j = 0; j < hidden; j++) {
                    gw2[row + j] += d * h[j];
                    dh[j] += d * this.w2[row + j];
                }
            }
            for (let j = 0; j < hidden; j++) {
                if (h[j] <= 0)
                    continue;
                const d = dh[j];
                gb1[j] += d;
                const row = j * inputs;
                for (let i = 0; i < inputs; i++)
                    gw1[row + i] += d * x[i];
            }
        }
        const n = batch.length;
        const beta1 = 0.9;
        const beta2 = 0.999;
        this.t++;
        const c1 = 1 - beta1 ** this.t;
        const c2 = 1 - beta2 ** this.t;
        [this.w1, this.b1, this.w2, this.b2].forEach((param, idx) => {
            const grad = g[idx];
            const m = this.m[idx];
            const v = this.v[idx];
            const decay = idx % 2 === 0 ? weightDecay : 0;
            for (let i = 0; i < param.length; i++) {
                const gi = grad[i] / n + decay * param[i];
                m[i] = beta1 * m[i] + (1 - beta1) * gi;
                v[i] = beta2 * v[i] + (1 - beta2) * gi * gi;
                param[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8);
            }
        });
        return loss / n;
    }
    async evaluate(set) {
        let loss = 0;
        let correct = 0;
        for (let n = 0; n < set.length; n++) {
            const { x, y } = set[n];
            if (n % 64 === 63)
                await yieldToEventLoop();
            const { p } = this.forward(x);
            loss -= Math.log(p[y] + 1e-12);
            if (argmax(p) === y)
                correct++;
        }
        return {
            loss: set.length ? loss / set.length : 0,
            accuracy: set.length ? correct / set.length : 0,
        };
    }
    snapshot() {
        return [this.w1, this.b1, this.w2, this.b2].map((p) => Float64Array.from(p));
    }
    restore([w1, b1, w2, b2]) {
        this.w1.set(w1);
        this.b1.set(b1);
        this.w2.set(w2);
        this.b2.set(b2);
    }
}
const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));
function argmax(p) {
    let best = 0;
    for (let k = 1; k < p.length; k++)
        if (p[k] > p[best])
            best = k;
    return best;
}
const round = (v, digits = 5) => Math.round(v * 10 ** digits) / 10 ** digits;
const toList = (a) => Array.from(a, (v) => round(v, 6));
async function trainSignModel(data, opts, onEpoch) {
    const rand = mulberry32(42);
    const labels = [...new Set(data.map((d) => d.label))].sort();
    const { train, val } = stratifiedSplit(data, labels, opts.validationSplit, rand);
    const evalSet = val.length ? val : train;
    const FEATURE_SIZE = data[0]?.vector.length ?? 0;
    const mean = new Float64Array(FEATURE_SIZE);
    const std = new Float64Array(FEATURE_SIZE);
    for (const { x } of train)
        for (let i = 0; i < FEATURE_SIZE; i++)
            mean[i] += x[i] / train.length;
    for (const { x } of train)
        for (let i = 0; i < FEATURE_SIZE; i++)
            std[i] += (x[i] - mean[i]) ** 2 / train.length;
    for (let i = 0; i < FEATURE_SIZE; i++)
        std[i] = Math.max(Math.sqrt(std[i]), 0.05);
    const normalise = (x) => {
        const out = new Float64Array(FEATURE_SIZE);
        for (let i = 0; i < FEATURE_SIZE; i++)
            out[i] = (x[i] - mean[i]) / std[i];
        return out;
    };
    const trainN = train.map((e) => ({ x: normalise(e.x), y: e.y }));
    const evalN = evalSet.map((e) => ({ x: normalise(e.x), y: e.y }));
    const net = new Mlp(FEATURE_SIZE, opts.hiddenUnits, labels.length, rand);
    const history = [];
    let best = {
        valAccuracy: -1,
        valLoss: Infinity,
        epoch: 0,
        weights: net.snapshot(),
    };
    const NOISE = 0.02;
    const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
    for (let epoch = 1; epoch <= opts.epochs; epoch++) {
        const order = shuffle([...train.keys()], rand);
        for (let start = 0; start < order.length; start += opts.batchSize) {
            const batch = order.slice(start, start + opts.batchSize).map((idx) => {
                const raw = train[idx].x;
                const noisy = new Float64Array(FEATURE_SIZE);
                for (let i = 0; i < FEATURE_SIZE; i++)
                    noisy[i] = raw[i] + gauss() * NOISE;
                return { x: normalise(noisy), y: train[idx].y };
            });
            net.step(batch, opts.learningRate, 1e-4);
            if ((start / opts.batchSize) % 2 === 1)
                await yieldToEventLoop();
        }
        const tr = await net.evaluate(trainN);
        const va = await net.evaluate(evalN);
        const stats = {
            epoch,
            loss: round(tr.loss),
            accuracy: round(tr.accuracy),
            valLoss: round(va.loss),
            valAccuracy: round(va.accuracy),
        };
        history.push(stats);
        if (va.accuracy > best.valAccuracy ||
            (va.accuracy === best.valAccuracy && va.loss < best.valLoss)) {
            best = {
                valAccuracy: va.accuracy,
                valLoss: va.loss,
                epoch,
                weights: net.snapshot(),
            };
        }
        await onEpoch(stats);
        await new Promise((resolve) => setImmediate(resolve));
    }
    net.restore(best.weights);
    const confusion = labels.map(() => labels.map(() => 0));
    for (const { x, y } of evalN)
        confusion[y][argmax(net.forward(x).p)]++;
    const perClass = labels.map((label, k) => {
        const tp = confusion[k][k];
        const support = confusion[k].reduce((a, b) => a + b, 0);
        const predicted = confusion.reduce((a, row) => a + row[k], 0);
        const precision = predicted ? tp / predicted : 0;
        const recall = support ? tp / support : 0;
        const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
        return {
            label,
            precision: round(precision, 4),
            recall: round(recall, 4),
            f1: round(f1, 4),
            support,
        };
    });
    const novelty = noveltyModel([...train, ...val].map((e) => ({ x: normalise(e.x), y: e.y, g: e.g })), labels.length, FEATURE_SIZE);
    const finalTrain = await net.evaluate(trainN);
    const finalVal = await net.evaluate(evalN);
    return {
        model: {
            labels,
            mean: toList(mean),
            std: toList(std),
            w1: toList(net.w1),
            b1: toList(net.b1),
            w2: toList(net.w2),
            b2: toList(net.b2),
            hiddenUnits: opts.hiddenUnits,
            centroids: novelty.centroids,
            radii: novelty.radii,
            noveltyMargin: novelty.margin,
        },
        history,
        bestEpoch: best.epoch,
        trainAccuracy: round(finalTrain.accuracy, 4),
        valAccuracy: round(finalVal.accuracy, 4),
        loss: round(finalTrain.loss),
        valLoss: round(finalVal.loss),
        trainCount: train.length,
        valCount: val.length,
        perClass,
        confusion,
    };
}
const percentile = (values, q) => {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
function classProfiles(examples, classes, size) {
    const centroids = Array.from({ length: classes }, () => new Float64Array(size));
    const counts = new Array(classes).fill(0);
    for (const { x, y } of examples) {
        counts[y]++;
        for (let i = 0; i < size; i++)
            centroids[y][i] += x[i];
    }
    centroids.forEach((c, k) => {
        for (let i = 0; i < size; i++)
            c[i] /= counts[k] || 1;
    });
    const distance = (x, k) => {
        let sum = 0;
        for (let i = 0; i < size; i++)
            sum += (x[i] - centroids[k][i]) ** 2;
        return Math.sqrt(sum / size);
    };
    const radii = centroids.map((_, k) => Math.max(percentile(examples.filter((e) => e.y === k).map((e) => distance(e.x, k)), 0.95), 1e-3));
    return { centroids, radii, distance };
}
const DEFAULT_NOVELTY_MARGIN = 1.6;
function noveltyModel(all, classes, size) {
    const ratios = [];
    const recordings = [...new Set(all.map((e) => `${e.y}|${e.g ?? ''}`))];
    for (const key of recordings) {
        const [yStr, g] = key.split('|');
        const y = Number(yStr);
        const rest = all.filter((e) => e.y !== y || (e.g ?? '') !== g);
        if (!g || !rest.some((e) => e.y === y))
            continue;
        const profile = classProfiles(rest, classes, size);
        for (const e of all) {
            if (e.y === y && (e.g ?? '') === g)
                ratios.push(profile.distance(e.x, y) / profile.radii[y]);
        }
    }
    const margin = ratios.length
        ? Math.min(3, Math.max(1.25, percentile(ratios, 0.95) * 1.05))
        : DEFAULT_NOVELTY_MARGIN;
    const { centroids, radii } = classProfiles(all, classes, size);
    return {
        centroids: centroids.flatMap((c) => Array.from(c, (v) => round(v, 4))),
        radii: radii.map((r) => round(r, 5)),
        margin: round(margin, 3),
    };
}
