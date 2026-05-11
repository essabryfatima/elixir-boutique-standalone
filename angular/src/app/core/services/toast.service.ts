import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  title: string;
  content: string;
  isOpen: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData>({ title: '', content: '', isOpen: false });
  modal$ = this.modalSubject.asObservable();

  show(title: string, content: string) {
    this.modalSubject.next({ title, content, isOpen: true });
  }

  close() {
    this.modalSubject.next({ title: '', content: '', isOpen: false });
  }
}