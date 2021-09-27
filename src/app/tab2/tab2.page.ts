import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { SwiperComponent } from 'swiper/angular';

// import Swiper core and required modules
import SwiperCore, { Pagination, Navigation } from 'swiper';

// install Swiper modules
SwiperCore.use([Pagination, Navigation]);

// Import Swiper styles

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Tab2Page {
  myAngularxQrCode = 'hello world';

  constructor(public actionSheetController: ActionSheetController) {}

  onSwiper(swiper) {
    console.log(swiper);
  }
  onSlideChange() {
    console.log('slide change');
  }

  test(e) {
    console.log('slide change');
    console.log(e);
  }

  @ViewChild('swiper', { static: false }) swiper?: SwiperComponent;
  slideNext() {
    this.swiper.swiperRef.slideNext(100);
  }
  slidePrev() {
    this.swiper.swiperRef.slidePrev(100);
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Token Actions',      
      buttons: [
        {
          text: 'Send',
          icon: 'share',
          handler: () => {
            console.log('Send clicked');
          },
        },
        {
          text: 'View',
          icon: 'open',
          handler: () => {
            console.log('Share clicked');
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          },
        },
      ],
    });
    await actionSheet.present();

    const { role } = await actionSheet.onDidDismiss();
    console.log('onDidDismiss resolved with role', role);
  }
}
