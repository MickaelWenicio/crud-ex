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
import { Client } from '../../core/models';
import { ClientsService } from '../../core/services/clients.service';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatDialogModule,
  ],
  templateUrl: './clients-page.component.html',
  styleUrl: './clients-page.component.scss',
})
export class ClientsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly dialog = inject(MatDialog);
  private formDialogRef: MatDialogRef<unknown> | null = null;

  @ViewChild('clientFormDialog') clientFormDialog?: TemplateRef<unknown>;

  clients: Client[] = [];
  editingId: string | null = null;
  readonly displayedColumns = ['name', 'email', 'cnpj', 'razaoSocial', 'nomeFantasia', 'actions'];
  filterTerm = '';
  private filterDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    cnpj: ['', [Validators.required]],
    razaoSocial: [''],
    nomeFantasia: [''],
    address: [''],
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.clientsService.list(1, 50, this.filterTerm).subscribe({
      next: (response) => {
        this.clients = response.data;
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel carregar os clientes.', 'error');
      },
    });
  }

  openCreateModal(): void {
    this.resetForm(false);
    this.openFormModal();
  }

  openEditModal(client: Client): void {
    this.editingId = client.id;
    this.form.patchValue({
      name: client.name,
      email: client.email,
      cnpj: this.formatCnpj(client.cnpj),
      razaoSocial: client.razaoSocial ?? '',
      nomeFantasia: client.nomeFantasia ?? '',
      address: client.address ?? '',
    });
    this.openFormModal();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const cnpjDigits = this.onlyDigits(payload.cnpj);
    if (cnpjDigits.length !== 14) {
      void Swal.fire('Atencao', 'Informe um CNPJ valido com 14 digitos.', 'warning');
      return;
    }

    const request$ = this.editingId
      ? this.clientsService.update(this.editingId, { ...payload, cnpj: cnpjDigits })
      : this.clientsService.create({ ...payload, cnpj: cnpjDigits });

    request$.subscribe({
      next: async () => {
        await Swal.fire('Sucesso', 'Cliente salvo com sucesso.', 'success');
        this.resetForm(false);
        this.formDialogRef?.close();
        this.loadClients();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao salvar cliente.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  async remove(client: Client): Promise<void> {
    const result = await Swal.fire({
      title: 'Excluir cliente?',
      text: client.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    this.clientsService.remove(client.id).subscribe({
      next: async () => {
        await Swal.fire('Excluido', 'Cliente removido.', 'success');
        this.loadClients();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao excluir cliente.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  enrichCnpj(): void {
    const cnpj = this.onlyDigits(this.form.controls.cnpj.value);
    if (cnpj.length !== 14) {
      void Swal.fire('Atencao', 'Informe um CNPJ com 14 digitos.', 'warning');
      return;
    }

    this.clientsService.enrich(cnpj).subscribe({
      next: async (data) => {
        const razaoSocial = (data['razao_social'] as string) ?? '';
        const nomeFantasia = (data['nome_fantasia'] as string) ?? '';

        const addressParts = [
          data['descricao_tipo_de_logradouro'],
          data['logradouro'],
          data['numero'],
          data['bairro'],
          data['municipio'],
          data['uf'],
        ]
          .filter(Boolean)
          .join(', ');

        this.form.patchValue({
          name: nomeFantasia || razaoSocial || this.form.controls.name.value,
          razaoSocial,
          nomeFantasia,
          address: addressParts,
        });

        await Swal.fire('Sucesso', 'Dados do CNPJ carregados.', 'success');
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel consultar o CNPJ.', 'error');
      },
    });
  }

  onCnpjInput(): void {
    const value = this.form.controls.cnpj.value;
    const digits = this.onlyDigits(value);
    const masked = this.formatCnpj(digits);
    this.form.controls.cnpj.setValue(masked, { emitEvent: false });
  }

  onFilterChange(): void {
    this.scheduleFilterReload();
  }

  clearFilter(): void {
    this.filterTerm = '';
    this.loadClients();
  }

  resetForm(closeDialog = true): void {
    this.form.reset({
      name: '',
      email: '',
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      address: '',
    });
    this.editingId = null;

    if (closeDialog) {
      this.formDialogRef?.close();
    }
  }

  private openFormModal(): void {
    if (!this.clientFormDialog) return;
    this.formDialogRef = this.dialog.open(this.clientFormDialog, {
      width: '900px',
      maxWidth: '96vw',
    });
  }

  private scheduleFilterReload(): void {
    if (this.filterDebounce) {
      clearTimeout(this.filterDebounce);
    }

    this.filterDebounce = setTimeout(() => {
      this.loadClients();
    }, 300);
  }

  private onlyDigits(value: string): string {
    return (value ?? '').replace(/\D/g, '').slice(0, 14);
  }

  private formatCnpj(value: string): string {
    const digits = this.onlyDigits(value);
    if (!digits) return '';

    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 5);
    const p3 = digits.slice(5, 8);
    const p4 = digits.slice(8, 12);
    const p5 = digits.slice(12, 14);

    if (digits.length <= 2) return p1;
    if (digits.length <= 5) return `${p1}.${p2}`;
    if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
    if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
    return `${p1}.${p2}.${p3}/${p4}-${p5}`;
  }
}
