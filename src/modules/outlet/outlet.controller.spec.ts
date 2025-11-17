import { Test, TestingModule } from '@nestjs/testing';
import { OutletController } from './outlet.controller';

describe('OutletController', () => {
  let controller: OutletController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutletController],
    }).compile();

    controller = module.get<OutletController>(OutletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
