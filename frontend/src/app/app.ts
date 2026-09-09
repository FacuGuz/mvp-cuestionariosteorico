import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/layout/header/header.component';
import { CuestionarioCreatorComponent } from './components/teacher/cuestionario-creator/cuestionario-creator.component';
import { CuestionarioSolverComponent } from './components/student/cuestionario-solver/cuestionario-solver.component';
import { ApiLogsModalComponent } from './components/shared/api-logs-modal/api-logs-modal.component';
import { GamificationService } from './core/services/gamification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    CuestionarioCreatorComponent,
    CuestionarioSolverComponent,
    ApiLogsModalComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly gamification = inject(GamificationService);
}
