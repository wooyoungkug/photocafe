import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { AgentController } from './controllers/agent.controller';
import { AgentTokenAdminController } from './controllers/agent-token-admin.controller';
import { AgentService } from './services/agent.service';
import { AgentTokenService } from './services/agent-token.service';
import { AgentTokenGuard } from './guards/agent-token.guard';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [AgentController, AgentTokenAdminController],
  providers: [AgentService, AgentTokenService, AgentTokenGuard],
  exports: [AgentTokenService],
})
export class AgentModule {}
