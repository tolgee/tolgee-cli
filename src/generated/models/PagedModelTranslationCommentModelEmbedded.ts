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
    TranslationCommentModel,
    TranslationCommentModelFromJSON,
    TranslationCommentModelFromJSONTyped,
    TranslationCommentModelToJSON,
} from './TranslationCommentModel';

/**
 * 
 * @export
 * @interface PagedModelTranslationCommentModelEmbedded
 */
export interface PagedModelTranslationCommentModelEmbedded {
    /**
     * 
     * @type {Array<TranslationCommentModel>}
     * @memberof PagedModelTranslationCommentModelEmbedded
     */
    translationComments?: Array<TranslationCommentModel>;
}

export function PagedModelTranslationCommentModelEmbeddedFromJSON(json: any): PagedModelTranslationCommentModelEmbedded {
    return PagedModelTranslationCommentModelEmbeddedFromJSONTyped(json, false);
}

export function PagedModelTranslationCommentModelEmbeddedFromJSONTyped(json: any, ignoreDiscriminator: boolean): PagedModelTranslationCommentModelEmbedded {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'translationComments': !exists(json, 'translationComments') ? undefined : ((json['translationComments'] as Array<any>).map(TranslationCommentModelFromJSON)),
    };
}

export function PagedModelTranslationCommentModelEmbeddedToJSON(value?: PagedModelTranslationCommentModelEmbedded | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'translationComments': value.translationComments === undefined ? undefined : ((value.translationComments as Array<any>).map(TranslationCommentModelToJSON)),
    };
}

