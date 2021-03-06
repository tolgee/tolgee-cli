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
 * @interface CreateKeyDto
 */
export interface CreateKeyDto {
    /**
     * Name of the key
     * @type {string}
     * @memberof CreateKeyDto
     */
    name: string;
    /**
     * 
     * @type {{ [key: string]: string; }}
     * @memberof CreateKeyDto
     */
    translations?: { [key: string]: string; };
    /**
     * 
     * @type {Array<string>}
     * @memberof CreateKeyDto
     */
    tags?: Array<string>;
    /**
     * Ids of screenshots uploaded with /v2/image-upload endpoint
     * @type {Array<number>}
     * @memberof CreateKeyDto
     */
    screenshotUploadedImageIds?: Array<number>;
}

export function CreateKeyDtoFromJSON(json: any): CreateKeyDto {
    return CreateKeyDtoFromJSONTyped(json, false);
}

export function CreateKeyDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): CreateKeyDto {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'name': json['name'],
        'translations': !exists(json, 'translations') ? undefined : json['translations'],
        'tags': !exists(json, 'tags') ? undefined : json['tags'],
        'screenshotUploadedImageIds': !exists(json, 'screenshotUploadedImageIds') ? undefined : json['screenshotUploadedImageIds'],
    };
}

export function CreateKeyDtoToJSON(value?: CreateKeyDto | null): any {
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
        'screenshotUploadedImageIds': value.screenshotUploadedImageIds,
    };
}

