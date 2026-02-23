import { NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService } from '../../core/services/products.service';
import { ProductImagesDialogComponent } from './product-images-dialog.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
})
export class ProductsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly productsService = inject(ProductsService);
  private readonly dialog = inject(MatDialog);
  private formDialogRef: MatDialogRef<unknown> | null = null;
  private descriptionElementsSub: Subscription | null = null;
  private truncatedDescriptionIds = new Set<string>();

  @ViewChild('productFormDialog') productFormDialog?: TemplateRef<unknown>;
  @ViewChildren('descriptionText') descriptionTextElements?: QueryList<ElementRef<HTMLElement>>;

  products: Product[] = [];
  editingId: string | null = null;
  readonly displayedColumns = ['name', 'description', 'salePrice', 'stock', 'actions'];
  readonly isAdmin = this.authService.hasRole('ADMIN');
  filterTerm = '';
  private filterDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    salePrice: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit(): void {
    this.descriptionElementsSub = this.descriptionTextElements?.changes.subscribe(() => {
      this.scheduleDescriptionTruncationUpdate();
    }) ?? null;

    this.scheduleDescriptionTruncationUpdate();
  }

  ngOnDestroy(): void {
    this.descriptionElementsSub?.unsubscribe();
    if (this.filterDebounce) {
      clearTimeout(this.filterDebounce);
    }
  }

  loadProducts(): void {
    this.productsService.list(1, 50, this.filterTerm).subscribe({
      next: (response) => {
        this.products = response.data;
        this.scheduleDescriptionTruncationUpdate();
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel carregar os produtos.', 'error');
      },
    });
  }

  openCreateModal(): void {
    this.resetForm(false);
    this.openFormModal();
  }

  openEditModal(product: Product): void {
    this.editingId = product.id;
    this.form.patchValue({
      name: product.name,
      description: product.description ?? '',
      salePrice: Number(product.salePrice),
      stock: Number(product.stock),
    });
    this.openFormModal();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.productsService.update(this.editingId, payload)
      : this.productsService.create(payload);

    request$.subscribe({
      next: async () => {
        await Swal.fire('Sucesso', 'Produto salvo com sucesso.', 'success');
        this.resetForm(false);
        this.formDialogRef?.close();
        this.loadProducts();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao salvar produto.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  async remove(product: Product): Promise<void> {
    const result = await Swal.fire({
      title: 'Excluir produto?',
      html: `
        <p><b>${product.name}</b></p>
        <p>Este produto pode estar vinculado a pedidos.</p>
        <p>Ao remover, os pedidos relacionados serao recalculados e seus valores podem mudar.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    this.productsService.remove(product.id).subscribe({
      next: async () => {
        await Swal.fire('Excluido', 'Produto removido.', 'success');
        this.loadProducts();
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao excluir produto.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  async onUploadImages(product: Product, event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];

    if (files.length === 0) return;

    this.productsService.uploadImages(product.id, files).subscribe({
      next: async () => {
        await Swal.fire('Sucesso', 'Imagens enviadas com sucesso.', 'success');
        target.value = '';
      },
      error: async (error) => {
        const message = error?.error?.message ?? 'Falha ao enviar imagens.';
        await Swal.fire('Erro', Array.isArray(message) ? message.join(', ') : message, 'error');
      },
    });
  }

  viewImages(product: Product): void {
    this.productsService.listImages(product.id).subscribe({
      next: (images) => {
        this.dialog.open(ProductImagesDialogComponent, {
          width: '980px',
          maxWidth: '96vw',
          data: {
            productId: product.id,
            productName: product.name,
            images,
          },
        });
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel listar imagens.', 'error');
      },
    });
  }

  onFilterChange(): void {
    this.scheduleFilterReload();
  }

  clearFilter(): void {
    this.filterTerm = '';
    this.loadProducts();
  }

  isDescriptionTruncated(productId: string): boolean {
    return this.truncatedDescriptionIds.has(productId);
  }

  resetForm(closeDialog = true): void {
    this.form.reset({
      name: '',
      description: '',
      salePrice: 0,
      stock: 0,
    });
    this.editingId = null;

    if (closeDialog) {
      this.formDialogRef?.close();
    }
  }

  private openFormModal(): void {
    if (!this.productFormDialog) return;
    this.formDialogRef = this.dialog.open(this.productFormDialog, {
      width: '800px',
      maxWidth: '96vw',
    });
  }

  private scheduleFilterReload(): void {
    if (this.filterDebounce) {
      clearTimeout(this.filterDebounce);
    }

    this.filterDebounce = setTimeout(() => {
      this.loadProducts();
    }, 300);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleDescriptionTruncationUpdate();
  }

  private scheduleDescriptionTruncationUpdate(): void {
    setTimeout(() => {
      this.updateDescriptionTruncation();
    }, 0);
  }

  private updateDescriptionTruncation(): void {
    const currentElements = this.descriptionTextElements;
    if (!currentElements) return;

    const truncatedIds = new Set<string>();

    currentElements.forEach((descriptionElementRef) => {
      const element = descriptionElementRef.nativeElement;
      const productId = element.dataset['productId'];

      if (!productId) return;

      const isOverflowing =
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
      if (isOverflowing) {
        truncatedIds.add(productId);
      }
    });

    this.truncatedDescriptionIds = truncatedIds;
  }
}
