import { ExpressSwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerCustomOptions: ExpressSwaggerCustomOptions = {
  // explorer?: boolean;
  // swaggerOptions?: Record<string, any>;
  // customCss?: string;
  // customCssUrl?: string;
  // customJs?: string;
  swaggerOptions: {
    persistAuthorization: true,
    requestInterceptor: (req: any) => {
      req.credentials = 'include';
      return req;
    },
  },
  customfavIcon:
    'https://www.bing.com/images/search?view=detailV2&ccid=boJb1YlX&id=27EE56C7D013C2AE9C89CC3E89E1E8A0CF248518&thid=OIP.boJb1YlXVWTaJvHlHjHD8gHaHa&mediaurl=https%3a%2f%2ficons.iconarchive.com%2ficons%2fkxmylo%2fsimple%2f512%2faccessories-dictionary-icon.png&cdnurl=https%3a%2f%2fth.bing.com%2fth%2fid%2fR.6e825bd589575564da26f1e51e31c3f2%3frik%3dGIUkz6Do4Yk%252bzA%26pid%3dImgRaw%26r%3d0&exph=512&expw=512&q=icon&simid=608044528882554670&FORM=IRPRST&ck=7554FF3C3FD1C0D730DDB2717A68C901&selectedIndex=17',
  // swaggerUrl?: string;
  customSiteTitle: 'Custom title',
  // validatorUrl?: string;
  // url?: string;
  // urls?: Record<'url' | 'name', string>[];
};
