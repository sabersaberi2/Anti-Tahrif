import { Pipe, PipeTransform } from '@angular/core';
import moment from 'jalali-moment';
@Pipe({
  name: 'jalali',
})

export class JalaliPipe implements PipeTransform {
    transform(value: any, args?: any): any {
      const date = new Date(value);
      return moment.from(date.toString(), 'en').format('Do MMMM YYYY dddd HH:mm')
    }
}
