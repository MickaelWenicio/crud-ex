import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import Swal from 'sweetalert2';
import { Client, Order, Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ClientsService } from '../../core/services/clients.service';
import { OrdersService } from '../../core/services/orders.service';
import { ProductsService } from '../../core/services/products.service';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatDialogModule,
  ],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss',
})
export class OrdersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clientsService = inject(ClientsService);
  private readonly productsService = inject(ProductsService);
  private readonly ordersService = inject(OrdersService);
  private readonly dialog = inject(MatDialog);
  private formDialogRef: MatDialogRef<unknown> | null = null;
  private statusDialogRef: MatDialogRef<unknown> | null = null;

  @ViewChild('orderFormDialog') orderFormDialog?: TemplateRef<unknown>;
  @ViewChild('statusFormDialog') statusFormDialog?: TemplateRef<unknown>;

  clients: Client[] = [];
  searchedClients: Client[] = [];
  products: Product[] = [];
  orders: Order[] = [];
  orderClientOptions: Array<{ id: string; label: string }> = [];

  readonly isAdmin = this.authService.hasRole('ADMIN');
  readonly displayedColumns = ['id', 'client', 'status', 'total', 'actions'];
  selectedClientId = 'all';
  searchTerm = '';
  statusDraft: Order['status'] = 'PENDING';
  statusTargetOrder: Order | null = null;
  private filterDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    clientId: ['', [Validators.required]],
    items: this.fb.array([this.createItemGroup()]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadDependencies();
    this.loadOrders();
  }

  openCreateModal(): void {
    this.resetForm(false);
    if (!this.orderFormDialog) return;
    this.formDialogRef = this.dialog.open(this.orderFormDialog, {
      width: '980px',
      maxWidth: '96vw',
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  loadDependencies(): void {
    this.productsService.list(1, 100).subscribe({
      next: (res) => (this.products = res.data),
      error: async () => {
        this.products = [];
        await Swal.fire('Erro', 'Nao foi possivel carregar a lista de produtos.', 'error');
      },
    });

    this.clientsService.list(1, 100).subscribe({
      next: (res) => {
        this.clients = res.data;
        this.rebuildClientFilterOptions();
      },
      error: async () => {
        this.clients = [];
        this.rebuildClientFilterOptions();
        await Swal.fire('Erro', 'Nao foi possivel carregar a lista de clientes.', 'error');
      },
    });
  }

  searchClients(term: string): void {
    const normalized = term.trim();
    if (!normalized) {
      this.searchedClients = [];
      return;
    }

    this.clientsService.search(normalized).subscribe({
      next: async (clients) => {
        this.searchedClients = clients;
        if (clients.length === 0) {
          await Swal.fire(
            'Nenhum cliente encontrado',
            'Tente buscar por CNPJ, email, nome ou razao social.',
            'info',
          );
        }
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel pesquisar clientes.', 'error');
      },
    });
  }

  loadOrders(): void {
    this.ordersService.list(1, 50, this.searchTerm, this.selectedClientId).subscribe({
      next: (res) => {
        this.orders = res.data;
        this.rebuildClientFilterOptions();
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel carregar os pedidos.', 'error');
      },
    });
  }

  createOrder(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.ordersService.create(this.form.getRawValue()).subscribe({
      next: async () => {
        await Swal.fire('Sucesso', 'Pedido criado com sucesso.', 'success');
        this.resetForm(false);
        this.formDialogRef?.close();
        this.loadOrders();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao criar pedido.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  async remove(order: Order): Promise<void> {
    if (!this.isAdmin) return;

    const result = await Swal.fire({
      title: 'Excluir pedido?',
      text: this.shortOrderId(order.id),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    this.ordersService.remove(order.id).subscribe({
      next: async () => {
        await Swal.fire('Excluido', 'Pedido removido.', 'success');
        this.loadOrders();
      },
      error: async () => {
        await Swal.fire('Erro', 'Falha ao remover pedido.', 'error');
      },
    });
  }

  openStatusModal(order: Order): void {
    if (!this.statusFormDialog) return;
    this.statusTargetOrder = order;
    this.statusDraft = order.status;
    this.statusDialogRef = this.dialog.open(this.statusFormDialog, {
      width: '520px',
      maxWidth: '96vw',
    });
  }

  saveStatus(): void {
    if (!this.statusTargetOrder) return;
    const orderId = this.statusTargetOrder.id;

    this.ordersService.update(orderId, { status: this.statusDraft }).subscribe({
      next: async () => {
        this.closeStatusModal();
        await Swal.fire('Sucesso', 'Status atualizado.', 'success');
        this.loadOrders();
      },
      error: async () => {
        await Swal.fire('Erro', 'Falha ao atualizar status.', 'error');
      },
    });
  }

  closeStatusModal(): void {
    this.statusDialogRef?.close();
    this.statusDialogRef = null;
    this.statusTargetOrder = null;
    this.statusDraft = 'PENDING';
  }

  showDetails(order: Order): void {
    const items = order.items ?? [];
    const html = items.length
      ? items
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;"><span>${item.product?.name ?? item.productId}</span><span>${item.quantity} x R$ ${item.unitPrice}</span></div>`,
          )
          .join('')
      : '<p>Sem itens detalhados.</p>';

    void Swal.fire({
      title: `Pedido ${this.shortOrderId(order.id)}`,
      html: `<p>Status: <b>${this.getStatusLabel(order.status)}</b></p>${html}`,
      width: 700,
    });
  }

  onClientFilterChange(): void {
    this.scheduleFilterReload();
  }

  clearClientFilter(): void {
    this.selectedClientId = 'all';
    this.searchTerm = '';
    this.loadOrders();
  }

  getStatusLabel(status: Order['status']): string {
    const labels: Record<Order['status'], string> = {
      PENDING: 'pendente',
      APPROVED: 'aprovado',
      CANCELLED: 'cancelado',
    };
    return labels[status];
  }

  getStatusBadgeClass(status: Order['status']): string {
    const classes: Record<Order['status'], string> = {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      CANCELLED: 'status-cancelled',
    };
    return classes[status];
  }

  shortOrderId(id: string): string {
    return id.split('-')[0] || id;
  }

  resetForm(closeDialog = true): void {
    this.form.reset({ clientId: '' });
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.searchedClients = [];

    if (closeDialog) {
      this.formDialogRef?.close();
    }
  }

  private createItemGroup() {
    return this.fb.nonNullable.group({
      productId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  private scheduleFilterReload(): void {
    if (this.filterDebounce) {
      clearTimeout(this.filterDebounce);
    }

    this.filterDebounce = setTimeout(() => {
      this.loadOrders();
    }, 300);
  }

  private rebuildClientFilterOptions(): void {
    const clientsMap = new Map<string, string>();

    this.clients.forEach((client) => {
      const label = client.cnpj ? `${client.name} (${client.cnpj})` : client.name;
      clientsMap.set(client.id, label);
    });

    this.orders.forEach((order) => {
      const clientId = order.client?.id ?? order.clientId;
      if (!clientId || clientsMap.has(clientId)) return;

      const fallbackName = order.client?.name ?? order.clientId;
      clientsMap.set(clientId, fallbackName);
    });

    this.orderClientOptions = Array.from(clientsMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (
      this.selectedClientId !== 'all' &&
      !this.orderClientOptions.some((client) => client.id === this.selectedClientId)
    ) {
      this.selectedClientId = 'all';
    }
  }
}
