import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Category, Product } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }
}
