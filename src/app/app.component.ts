import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Component, OnInit } from '@angular/core';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { OtkService } from './service/otk.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private otk: OtkService, private platform: Platform) {}

  ngOnInit() {
    if (!this.platform.is('mobileweb') && !this.platform.is('desktop')) {
      // Request permission to use push notifications
      // iOS will prompt user and return if they granted permission or not
      // Android will just grant without prompting
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          PushNotifications.register();
        } else {
          // Show some error
        }
      });

      PushNotifications.addListener('registration', (token: Token) => {
        this.otk.pnt = token.value;
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        alert('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push Received:');
          console.log(notification);
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push Action Performed:');
          console.log(notification);
        }
      );

      const closeElement = document.getElementById('closeBarcode');
      closeElement.onclick = () => {
        if (BarcodeScanner) {
          const angularElement = document.getElementById('angular');
          const barcodeElement = document.getElementById('barcode');
          BarcodeScanner.showBackground();
          BarcodeScanner.stopScan();
          barcodeElement.style.display = 'none';
          angularElement.style.display = 'block';
          // document.body.style.background = '';
          document.body.style.opacity = '1';
        }
      };
    }
  }
}
