package com.paypingmy.e2e.notifier;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;

public final class MainActivity extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Intent intent = getIntent();
    String title = intent.getStringExtra("title");
    String body = intent.getStringExtra("body");
    if (title != null && body != null) {
      NotificationManager manager = getSystemService(NotificationManager.class);
      manager.createNotificationChannel(new NotificationChannel(
          "e2e", "E2E notifications", NotificationManager.IMPORTANCE_DEFAULT));
      Notification notification = new Notification.Builder(this, "e2e")
          .setSmallIcon(android.R.drawable.ic_dialog_info)
          .setContentTitle(title)
          .setContentText(body)
          .setStyle(new Notification.BigTextStyle().bigText(body))
          .build();
      manager.notify(intent.getStringExtra("tag"), 1, notification);
    }
    finish();
  }
}
