import type { DefaultSharedModuleContext, LangiumServices, LangiumSharedServices, Module, PartialLangiumServices } from 'langium';
import { createDefaultModule, createDefaultSharedModule, inject } from 'langium';
import { EcchiGeneratedModule, EcchiGeneratedSharedModule } from './generated/module.js';
import { EcchiValidator, registerValidationChecks } from './ecchi-validator.js';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type EcchiAddedServices = {
    validation: {
        EcchiValidator: EcchiValidator
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type EcchiServices = LangiumServices & EcchiAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const EcchiModule: Module<EcchiServices, PartialLangiumServices & EcchiAddedServices> = {
    validation: {
        EcchiValidator: () => new EcchiValidator()
    }
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createEcchiServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    Ecchi: EcchiServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        EcchiGeneratedSharedModule
    );
    const Ecchi = inject(
        createDefaultModule({ shared }),
        EcchiGeneratedModule,
        EcchiModule
    );
    shared.ServiceRegistry.register(Ecchi);
    registerValidationChecks(Ecchi);
    return { shared, Ecchi };
}
