// activity.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private activitySource = new BehaviorSubject<string>(''); // Inicialmente vacío
  currentActivity = this.activitySource.asObservable();

  changeActivity(activity: string) {
    this.activitySource.next(activity);
  }
}

