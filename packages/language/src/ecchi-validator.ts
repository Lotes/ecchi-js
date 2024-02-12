import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { EcchiServices } from './ecchi-module.js';
import { EcchiAstType, Model } from './generated/ast.js';

export function registerValidationChecks(services: EcchiServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.EcchiValidator;
    const checks: ValidationChecks<EcchiAstType> = {
        Model: validator.checkModel
    };
    registry.register(checks, validator);
}

export class EcchiValidator {
    checkModel(model: Model, accept: ValidationAcceptor): void {}
}
