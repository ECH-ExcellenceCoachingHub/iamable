import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateUserDto,
  BulkUserActionDto,
  ListUsersQueryDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/manage-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('reports')
  async createReport(@Request() req, @Body() createReportDto: CreateReportDto) {
    return this.adminService.createReport(req.user.id, createReportDto);
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getReports() {
    return this.adminService.findAll();
  }

  @Get('reports/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getReport(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Put('reports/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateReportStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('adminResponse') adminResponse?: string,
  ) {
    return this.adminService.updateStatus(id, status, adminResponse);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users/export')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async exportUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.exportUsers(query);
  }

  @Post('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Post('users/bulk')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async bulkUserAction(@Request() req, @Body() dto: BulkUserActionDto) {
    return this.adminService.bulkUserAction(req.user.id.toString(), dto);
  }

  @Get('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateUser(@Request() req, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(req.user.id.toString(), id, dto);
  }

  @Put('users/:id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateUserRole(@Request() req, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(req.user.id.toString(), id, dto.role);
  }

  @Put('users/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateUserStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(req.user.id.toString(), id, dto.isActive, dto.reason);
  }

  @Put('users/:id/password')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async resetUserPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
    return this.adminService.resetUserPassword(id, dto.password);
  }

  @Delete('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteUser(@Request() req, @Param('id') id: string) {
    return this.adminService.deleteUser(req.user.id.toString(), id);
  }
}
