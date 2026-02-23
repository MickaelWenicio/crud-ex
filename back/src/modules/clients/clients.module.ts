import { Module } from '@nestjs/common';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { ClientsRepository } from './repositories/clients.repository';
import { CnpjGateway } from './gateways/cnpj.gateway';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository, CnpjGateway],
})
export class ClientsModule {}
