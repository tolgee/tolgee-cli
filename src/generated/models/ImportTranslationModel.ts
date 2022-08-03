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
 * @interface ImportTranslationModel
 */
export interface ImportTranslationModel {
    /**
     * 
     * @type {number}
     * @memberof ImportTranslationModel
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof ImportTranslationModel
     */
    text?: string;
    /**
     * 
     * @type {string}
     * @memberof ImportTranslationModel
     */
    keyName: string;
    /**
     * 
     * @type {number}
     * @memberof ImportTranslationModel
     */
    keyId: number;
    /**
     * 
     * @type {number}
     * @memberof ImportTranslationModel
     */
    conflictId?: number;
    /**
     * 
     * @type {string}
     * @memberof ImportTranslationModel
     */
    conflictText?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ImportTranslationModel
     */
    override: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ImportTranslationModel
     */
    resolved: boolean;
}

/**
 * Check if a given object implements the ImportTranslationModel interface.
 */
export function instanceOfImportTranslationModel(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "id" in value;
    isInstance = isInstance && "keyName" in value;
    isInstance = isInstance && "keyId" in value;
    isInstance = isInstance && "override" in value;
    isInstance = isInstance && "resolved" in value;

    return isInstance;
}

export function ImportTranslationModelFromJSON(json: any): ImportTranslationModel {
    return ImportTranslationModelFromJSONTyped(json, false);
}

export function ImportTranslationModelFromJSONTyped(json: any, ignoreDiscriminator: boolean): ImportTranslationModel {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': json['id'],
        'text': !exists(json, 'text') ? undefined : json['text'],
        'keyName': json['keyName'],
        'keyId': json['keyId'],
        'conflictId': !exists(json, 'conflictId') ? undefined : json['conflictId'],
        'conflictText': !exists(json, 'conflictText') ? undefined : json['conflictText'],
        'override': json['override'],
        'resolved': json['resolved'],
    };
}

export function ImportTranslationModelToJSON(value?: ImportTranslationModel | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
        'text': value.text,
        'keyName': value.keyName,
        'keyId': value.keyId,
        'conflictId': value.conflictId,
        'conflictText': value.conflictText,
        'override': value.override,
        'resolved': value.resolved,
    };
}

