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
    PagedModelEntityModelImportFileIssueViewEmbedded,
    PagedModelEntityModelImportFileIssueViewEmbeddedFromJSON,
    PagedModelEntityModelImportFileIssueViewEmbeddedFromJSONTyped,
    PagedModelEntityModelImportFileIssueViewEmbeddedToJSON,
} from './PagedModelEntityModelImportFileIssueViewEmbedded';

/**
 * 
 * @export
 * @interface PagedModelEntityModelImportFileIssueView
 */
export interface PagedModelEntityModelImportFileIssueView {
    /**
     * 
     * @type {PagedModelEntityModelImportFileIssueViewEmbedded}
     * @memberof PagedModelEntityModelImportFileIssueView
     */
    embedded?: PagedModelEntityModelImportFileIssueViewEmbedded;
    /**
     * 
     * @type {PageMetadata}
     * @memberof PagedModelEntityModelImportFileIssueView
     */
    page?: PageMetadata;
}

export function PagedModelEntityModelImportFileIssueViewFromJSON(json: any): PagedModelEntityModelImportFileIssueView {
    return PagedModelEntityModelImportFileIssueViewFromJSONTyped(json, false);
}

export function PagedModelEntityModelImportFileIssueViewFromJSONTyped(json: any, ignoreDiscriminator: boolean): PagedModelEntityModelImportFileIssueView {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'embedded': !exists(json, '_embedded') ? undefined : PagedModelEntityModelImportFileIssueViewEmbeddedFromJSON(json['_embedded']),
        'page': !exists(json, 'page') ? undefined : PageMetadataFromJSON(json['page']),
    };
}

export function PagedModelEntityModelImportFileIssueViewToJSON(value?: PagedModelEntityModelImportFileIssueView | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        '_embedded': PagedModelEntityModelImportFileIssueViewEmbeddedToJSON(value.embedded),
        'page': PageMetadataToJSON(value.page),
    };
}

