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
    PageMetadata,
    PageMetadataFromJSON,
    PageMetadataFromJSONTyped,
    PageMetadataToJSON,
} from './PageMetadata';
import {
    PagedModelTranslationCommentModelEmbedded,
    PagedModelTranslationCommentModelEmbeddedFromJSON,
    PagedModelTranslationCommentModelEmbeddedFromJSONTyped,
    PagedModelTranslationCommentModelEmbeddedToJSON,
} from './PagedModelTranslationCommentModelEmbedded';

/**
 * 
 * @export
 * @interface PagedModelTranslationCommentModel
 */
export interface PagedModelTranslationCommentModel {
    /**
     * 
     * @type {PagedModelTranslationCommentModelEmbedded}
     * @memberof PagedModelTranslationCommentModel
     */
    embedded?: PagedModelTranslationCommentModelEmbedded;
    /**
     * 
     * @type {PageMetadata}
     * @memberof PagedModelTranslationCommentModel
     */
    page?: PageMetadata;
}

export function PagedModelTranslationCommentModelFromJSON(json: any): PagedModelTranslationCommentModel {
    return PagedModelTranslationCommentModelFromJSONTyped(json, false);
}

export function PagedModelTranslationCommentModelFromJSONTyped(json: any, ignoreDiscriminator: boolean): PagedModelTranslationCommentModel {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'embedded': !exists(json, '_embedded') ? undefined : PagedModelTranslationCommentModelEmbeddedFromJSON(json['_embedded']),
        'page': !exists(json, 'page') ? undefined : PageMetadataFromJSON(json['page']),
    };
}

export function PagedModelTranslationCommentModelToJSON(value?: PagedModelTranslationCommentModel | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        '_embedded': PagedModelTranslationCommentModelEmbeddedToJSON(value.embedded),
        'page': PageMetadataToJSON(value.page),
    };
}

