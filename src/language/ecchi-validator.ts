import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { EcchiAstType, Person } from './generated/ast.js';
import type { EcchiServices } from './ecchi-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: EcchiServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.EcchiValidator;
    const checks: ValidationChecks<EcchiAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class EcchiValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
