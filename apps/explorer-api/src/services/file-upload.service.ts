import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Connection } from 'typeorm';
import { S3 } from 'aws-sdk';
import { exec } from '@app/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(fileName: string, bucketS3: string, file: Express.Multer.File): Promise<string> {
    try {
      // check file is not huge or other validations
      const [uploadResultError, uploadResult] = await exec(this.uploadS3(file.buffer, bucketS3, fileName, file.mimetype));
      if (uploadResultError) throw new InternalServerErrorException('file upload failed');
      const { Location } = uploadResult;
      return Location;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async uploadS3(file: Buffer, bucket: string, name: string, contentType: string): Promise<S3.ManagedUpload.SendData> {
    const s3 = this.getS3();
    const params: S3.Types.PutObjectRequest = {
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ContentType: contentType,
    };

    return s3.upload(params).promise();
  }

  getS3() {
    return new S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
  }
}
