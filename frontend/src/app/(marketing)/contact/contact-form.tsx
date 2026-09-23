'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { toast } from '@/store/toast-store';

const CONTACT_EMAIL = 'hello@amable.com';

type FormState = { name: string; email: string; subject: string; message: string };
type Errors = Partial<Record<keyof FormState, string>>;

function validate(values: FormState): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = 'Please enter your name.';
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.subject) errors.subject = 'Please choose a topic.';
  if (values.message.trim().length < 10) errors.message = 'Please write at least 10 characters.';
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<FormState>({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // There is no contact endpoint yet, so hand the message to the visitor's mail app.
    const subject = encodeURIComponent(`[${values.subject}] Message from ${values.name}`);
    const body = encodeURIComponent(`${values.message}\n\n— ${values.name} (${values.email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success('Opening your email app', `Your message is ready to send to ${CONTACT_EMAIL}.`);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" placeholder="Your name" autoComplete="name" value={values.name} onChange={update('name')} error={errors.name} />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
        />
      </div>
      <Select label="Topic" value={values.subject} onChange={update('subject')} error={errors.subject}>
        <option value="">Select a topic</option>
        <option value="General">General inquiry</option>
        <option value="Support">Technical support</option>
        <option value="Sales">Sales</option>
        <option value="Partnership">Partnership</option>
        <option value="Feedback">Feedback</option>
      </Select>
      <Textarea
        label="Message"
        rows={6}
        placeholder="How can we help?"
        value={values.message}
        onChange={update('message')}
        error={errors.message}
      />
      <Button type="submit" size="lg" variant="gradient" className="w-full">
        <Send />
        Send message
      </Button>
    </form>
  );
}
