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
    EntityDescriptionWithRelations,
    EntityDescriptionWithRelationsFromJSON,
    EntityDescriptionWithRelationsFromJSONTyped,
    EntityDescriptionWithRelationsToJSON,
} from './EntityDescriptionWithRelations';

/**
 * 
 * @export
 * @interface ExistenceEntityDescription
 */
export interface ExistenceEntityDescription {
    /**
     * 
     * @type {string}
     * @memberof ExistenceEntityDescription
     */
    entityClass: string;
    /**
     * 
     * @type {number}
     * @memberof ExistenceEntityDescription
     */
    entityId: number;
    /**
     * 
     * @type {{ [key: string]: object; }}
     * @memberof ExistenceEntityDescription
     */
    data: { [key: string]: object; };
    /**
     * 
     * @type {{ [key: string]: EntityDescriptionWithRelations; }}
     * @memberof ExistenceEntityDescription
     */
    relations: { [key: string]: EntityDescriptionWithRelations; };
    /**
     * 
     * @type {boolean}
     * @memberof ExistenceEntityDescription
     */
    _exists?: boolean;
}

export function ExistenceEntityDescriptionFromJSON(json: any): ExistenceEntityDescription {
    return ExistenceEntityDescriptionFromJSONTyped(json, false);
}

export function ExistenceEntityDescriptionFromJSONTyped(json: any, ignoreDiscriminator: boolean): ExistenceEntityDescription {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'entityClass': json['entityClass'],
        'entityId': json['entityId'],
        'data': json['data'],
        'relations': (mapValues(json['relations'], EntityDescriptionWithRelationsFromJSON)),
        '_exists': !exists(json, 'exists') ? undefined : json['exists'],
    };
}

export function ExistenceEntityDescriptionToJSON(value?: ExistenceEntityDescription | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'entityClass': value.entityClass,
        'entityId': value.entityId,
        'data': value.data,
        'relations': (mapValues(value.relations, EntityDescriptionWithRelationsToJSON)),
        'exists': value._exists,
    };
}

