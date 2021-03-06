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
    TranslationModel,
    TranslationModelFromJSON,
    TranslationModelFromJSONTyped,
    TranslationModelToJSON,
} from './TranslationModel';

/**
 * 
 * @export
 * @interface SetTranslationsResponseModel
 */
export interface SetTranslationsResponseModel {
    /**
     * Id of key record
     * @type {number}
     * @memberof SetTranslationsResponseModel
     */
    keyId: number;
    /**
     * Name of key
     * @type {string}
     * @memberof SetTranslationsResponseModel
     */
    keyName: string;
    /**
     * Translations object containing values updated in this request
     * @type {{ [key: string]: TranslationModel; }}
     * @memberof SetTranslationsResponseModel
     */
    translations: { [key: string]: TranslationModel; };
}

export function SetTranslationsResponseModelFromJSON(json: any): SetTranslationsResponseModel {
    return SetTranslationsResponseModelFromJSONTyped(json, false);
}

export function SetTranslationsResponseModelFromJSONTyped(json: any, ignoreDiscriminator: boolean): SetTranslationsResponseModel {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'keyId': json['keyId'],
        'keyName': json['keyName'],
        'translations': (mapValues(json['translations'], TranslationModelFromJSON)),
    };
}

export function SetTranslationsResponseModelToJSON(value?: SetTranslationsResponseModel | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'keyId': value.keyId,
        'keyName': value.keyName,
        'translations': (mapValues(value.translations, TranslationModelToJSON)),
    };
}

