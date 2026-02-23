import { NgIf } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import Swal from 'sweetalert2';
import { UserEntity } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    NgIf,
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private formDialogRef: MatDialogRef<unknown> | null = null;

  @ViewChild('userFormDialog') userFormDialog?: TemplateRef<unknown>;

  users: UserEntity[] = [];
  readonly displayedColumns = ['name', 'email', 'role', 'actions'];
  filterTerm = '';
  private filterDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['USER' as 'ADMIN' | 'USER', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.list(1, 50, this.filterTerm).subscribe({
      next: (res) => {
        this.users = res.data;
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel carregar usuarios.', 'error');
      },
    });
  }

  openCreateModal(): void {
    this.form.reset({
      name: '',
      email: '',
      password: '',
      role: 'USER',
    });

    if (!this.userFormDialog) return;
    this.formDialogRef = this.dialog.open(this.userFormDialog, {
      width: '720px',
      maxWidth: '96vw',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.usersService.create(this.form.getRawValue()).subscribe({
      next: async () => {
        await Swal.fire('Sucesso', 'Usuario criado com sucesso.', 'success');
        this.form.reset({
          name: '',
          email: '',
          password: '',
          role: 'USER',
        });
        this.formDialogRef?.close();
        this.loadUsers();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao criar usuario.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  async remove(user: UserEntity): Promise<void> {
    const result = await Swal.fire({
      title: 'Excluir usuario?',
      text: user.email,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    this.usersService.remove(user.id).subscribe({
      next: async () => {
        await Swal.fire('Excluido', 'Usuario removido.', 'success');
        this.loadUsers();
      },
      error: async () => {
        await Swal.fire('Erro', 'Falha ao excluir usuario.', 'error');
      },
    });
  }

  canDeleteUser(user: UserEntity): boolean {
    const currentUserId = this.authService.user()?.id;
    return !!currentUserId && user.id !== currentUserId;
  }

  onFilterChange(): void {
    this.scheduleFilterReload();
  }

  clearFilter(): void {
    this.filterTerm = '';
    this.loadUsers();
  }

  private scheduleFilterReload(): void {
    if (this.filterDebounce) {
      clearTimeout(this.filterDebounce);
    }

    this.filterDebounce = setTimeout(() => {
      this.loadUsers();
    }, 300);
  }
}
