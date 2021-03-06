/* tslint:disable */
/* eslint-disable */
/**
 * Tolgee API 
 * Tolgee Server API reference
 *
 * The version of the OpenAPI document: v1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import {
    TranslationHistoryModel,
    TranslationHistoryModelFromJSON,
    TranslationHistoryModelFromJSONTyped,
    TranslationHistoryModelToJSON,
} from './TranslationHistoryModel';

/**
 * 
 * @export
 * @interface PagedModelTranslationHistoryModelEmbedded
 */
export interface PagedModelTranslationHistoryModelEmbedded {
    /**
     * 
     * @type {Array<TranslationHistoryModel>}
     * @memberof PagedModelTranslationHistoryModelEmbedded
     */
    revisions?: Array<TranslationHistoryModel>;
}

export function PagedModelTranslationHistoryModelEmbeddedFromJSON(json: any): PagedModelTranslationHistoryModelEmbedded {
    return PagedModelTranslationHistoryModelEmbeddedFromJSONTyped(json, false);
}

export function PagedModelTranslationHistoryModelEmbeddedFromJSONTyped(json: any, ignoreDiscriminator: boolean): PagedModelTranslationHistoryModelEmbedded {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'revisions': !exists(json, 'revisions') ? undefined : ((json['revisions'] as Array<any>).map(TranslationHistoryModelFromJSON)),
    };
}

export function PagedModelTranslationHistoryModelEmbeddedToJSON(value?: PagedModelTranslationHistoryModelEmbedded | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'revisions': value.revisions === undefined ? undefined : ((value.revisions as Array<any>).map(TranslationHistoryModelToJSON)),
    };
}

