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
/**
 * 
 * @export
 * @interface ComplexEditKeyDto
 */
export interface ComplexEditKeyDto {
    /**
     * Name of the key
     * @type {string}
     * @memberof ComplexEditKeyDto
     */
    name: string;
    /**
     * Translations to update
     * @type {{ [key: string]: string; }}
     * @memberof ComplexEditKeyDto
     */
    translations?: { [key: string]: string; };
    /**
     * Tags of the key. If not provided tags won't be modified
     * @type {Array<string>}
     * @memberof ComplexEditKeyDto
     */
    tags?: Array<string>;
    /**
     * IDs of screenshots to delete
     * @type {Array<number>}
     * @memberof ComplexEditKeyDto
     */
    screenshotIdsToDelete?: Array<number>;
    /**
     * Ids of screenshots uploaded with /v2/image-upload endpoint
     * @type {Array<number>}
     * @memberof ComplexEditKeyDto
     */
    screenshotUploadedImageIds?: Array<number>;
}

export function ComplexEditKeyDtoFromJSON(json: any): ComplexEditKeyDto {
    return ComplexEditKeyDtoFromJSONTyped(json, false);
}

export function ComplexEditKeyDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): ComplexEditKeyDto {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'name': json['name'],
        'translations': !exists(json, 'translations') ? undefined : json['translations'],
        'tags': !exists(json, 'tags') ? undefined : json['tags'],
        'screenshotIdsToDelete': !exists(json, 'screenshotIdsToDelete') ? undefined : json['screenshotIdsToDelete'],
        'screenshotUploadedImageIds': !exists(json, 'screenshotUploadedImageIds') ? undefined : json['screenshotUploadedImageIds'],
    };
}

export function ComplexEditKeyDtoToJSON(value?: ComplexEditKeyDto | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'name': value.name,
        'translations': value.translations,
        'tags': value.tags,
        'screenshotIdsToDelete': value.screenshotIdsToDelete,
        'screenshotUploadedImageIds': value.screenshotUploadedImageIds,
    };
}

