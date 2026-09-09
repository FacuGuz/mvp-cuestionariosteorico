import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../core/services/gamification.service';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { UserRole } from '../../../core/models/gamification.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  protected readonly gamification = inject(GamificationService);
  protected readonly cuestionarioService = inject(CuestionarioService);

  cambiarRol(nuevoRol: UserRole): void {
    if (this.gamification.rolActual() !== nuevoRol) {
      this.gamification.setRol(nuevoRol);
    }
  }
}
