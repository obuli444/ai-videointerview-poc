import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadChildren: ()=> import('./video-interview/video-interview.module').then(m=> m.VideoInterviewModule)
    }
];
