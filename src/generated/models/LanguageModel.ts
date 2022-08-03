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
 * @interface LanguageModel
 */
export interface LanguageModel {
    /**
     * 
     * @type {number}
     * @memberof LanguageModel
     */
    id: number;
    /**
     * Language name in english
     * @type {string}
     * @memberof LanguageModel
     */
    name: string;
    /**
     * Language tag according to BCP 47 definition
     * @type {string}
     * @memberof LanguageModel
     */
    tag: string;
    /**
     * Language name in this language
     * @type {string}
     * @memberof LanguageModel
     */
    originalName?: string;
    /**
     * Language flag emoji as UTF-8 emoji
     * @type {string}
     * @memberof LanguageModel
     */
    flagEmoji?: string;
    /**
     * Whether is base language of project
     * @type {boolean}
     * @memberof LanguageModel
     */
    base: boolean;
}

/**
 * Check if a given object implements the LanguageModel interface.
 */
export function instanceOfLanguageModel(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "id" in value;
    isInstance = isInstance && "name" in value;
    isInstance = isInstance && "tag" in value;
    isInstance = isInstance && "base" in value;

    return isInstance;
}

export function LanguageModelFromJSON(json: any): LanguageModel {
    return LanguageModelFromJSONTyped(json, false);
}

export function LanguageModelFromJSONTyped(json: any, ignoreDiscriminator: boolean): LanguageModel {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': json['id'],
        'name': json['name'],
        'tag': json['tag'],
        'originalName': !exists(json, 'originalName') ? undefined : json['originalName'],
        'flagEmoji': !exists(json, 'flagEmoji') ? undefined : json['flagEmoji'],
        'base': json['base'],
    };
}

export function LanguageModelToJSON(value?: LanguageModel | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
        'name': value.name,
        'tag': value.tag,
        'originalName': value.originalName,
        'flagEmoji': value.flagEmoji,
        'base': value.base,
    };
}

