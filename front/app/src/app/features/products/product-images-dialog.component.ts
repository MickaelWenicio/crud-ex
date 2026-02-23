import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgFor, NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { ProductImage } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService } from '../../core/services/products.service';

type ProductImagesDialogData = {
  productId: string;
  productName: string;
  images: ProductImage[];
};

@Component({
  selector: 'app-product-images-dialog',
  standalone: true,
  imports: [NgFor, NgIf, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './product-images-dialog.component.html',
  styleUrl: './product-images-dialog.component.scss',
})
export class ProductImagesDialogComponent {
  private readonly productsService = inject(ProductsService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<ProductImagesDialogComponent>);

  readonly data = inject<ProductImagesDialogData>(MAT_DIALOG_DATA);
  readonly isAdmin = this.authService.hasRole('ADMIN');
  images: ProductImage[] = [...this.data.images];

  imageUrl(image: ProductImage): string {
    return this.productsService.getImageUrl(image);
  }

  async remove(image: ProductImage): Promise<void> {
    if (!this.isAdmin) return;
    const result = await Swal.fire({
      title: 'Excluir imagem?',
      text: image.filename,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    this.productsService.removeImage(this.data.productId, image.id).subscribe({
      next: async () => {
        this.images = this.images.filter((item) => item.id !== image.id);
        await Swal.fire('Sucesso', 'Imagem removida.', 'success');
      },
      error: async () => {
        await Swal.fire('Erro', 'Nao foi possivel remover a imagem.', 'error');
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.images);
  }
}
