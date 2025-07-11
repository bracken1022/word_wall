import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, Get, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('upload-words')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWordsFile(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      throw new Error('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
    }
    
    return this.adminService.processWordFile(file, req.user.id);
  }

  @Get('import-status')
  async getImportStatus(@Request() req: any) {
    return this.adminService.getImportStatus();
  }

  @Post('create-admin')
  async createAdminUser(@Body() userData: { username: string; email: string; password: string }) {
    return this.adminService.createAdminUser(userData.username, userData.email, userData.password);
  }
}