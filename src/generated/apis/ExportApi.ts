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


import * as runtime from '../runtime';
import type {
  ExportParams,
} from '../models';
import {
    ExportParamsFromJSON,
    ExportParamsToJSON,
} from '../models';

export interface Export1Request {
    languages?: Set<string>;
    format?: Export1FormatEnum;
    splitByScope?: boolean;
    splitByScopeDelimiter?: string;
    splitByScopeDepth?: number;
    filterKeyId?: Array<number>;
    filterKeyIdNot?: Array<number>;
    filterTag?: string;
    filterKeyPrefix?: string;
    filterState?: Array<Export1FilterStateEnum>;
    zip?: boolean;
    ak?: string;
    xAPIKey?: string;
}

export interface ExportPost1Request {
    exportParams: ExportParams;
    ak?: string;
    xAPIKey?: string;
}

/**
 * 
 */
export class ExportApi extends runtime.BaseAPI {

    /**
     * Exports data
     */
    async export1Raw(requestParameters: Export1Request, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<object>> {
        const queryParameters: any = {};

        if (requestParameters.languages) {
            queryParameters['languages'] = requestParameters.languages;
        }

        if (requestParameters.format !== undefined) {
            queryParameters['format'] = requestParameters.format;
        }

        if (requestParameters.splitByScope !== undefined) {
            queryParameters['splitByScope'] = requestParameters.splitByScope;
        }

        if (requestParameters.splitByScopeDelimiter !== undefined) {
            queryParameters['splitByScopeDelimiter'] = requestParameters.splitByScopeDelimiter;
        }

        if (requestParameters.splitByScopeDepth !== undefined) {
            queryParameters['splitByScopeDepth'] = requestParameters.splitByScopeDepth;
        }

        if (requestParameters.filterKeyId) {
            queryParameters['filterKeyId'] = requestParameters.filterKeyId;
        }

        if (requestParameters.filterKeyIdNot) {
            queryParameters['filterKeyIdNot'] = requestParameters.filterKeyIdNot;
        }

        if (requestParameters.filterTag !== undefined) {
            queryParameters['filterTag'] = requestParameters.filterTag;
        }

        if (requestParameters.filterKeyPrefix !== undefined) {
            queryParameters['filterKeyPrefix'] = requestParameters.filterKeyPrefix;
        }

        if (requestParameters.filterState) {
            queryParameters['filterState'] = requestParameters.filterState;
        }

        if (requestParameters.zip !== undefined) {
            queryParameters['zip'] = requestParameters.zip;
        }

        if (requestParameters.ak !== undefined) {
            queryParameters['ak'] = requestParameters.ak;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters.xAPIKey !== undefined && requestParameters.xAPIKey !== null) {
            headerParameters['X-API-Key'] = String(requestParameters.xAPIKey);
        }

        const response = await this.request({
            path: `/v2/projects/export`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Exports data
     */
    async export1(requestParameters: Export1Request = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<object> {
        const response = await this.export1Raw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Exports data (post). Useful when providing params exceeding allowed query size.   
     */
    async exportPost1Raw(requestParameters: ExportPost1Request, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<object>> {
        if (requestParameters.exportParams === null || requestParameters.exportParams === undefined) {
            throw new runtime.RequiredError('exportParams','Required parameter requestParameters.exportParams was null or undefined when calling exportPost1.');
        }

        const queryParameters: any = {};

        if (requestParameters.ak !== undefined) {
            queryParameters['ak'] = requestParameters.ak;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters.xAPIKey !== undefined && requestParameters.xAPIKey !== null) {
            headerParameters['X-API-Key'] = String(requestParameters.xAPIKey);
        }

        const response = await this.request({
            path: `/v2/projects/export`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ExportParamsToJSON(requestParameters.exportParams),
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Exports data (post). Useful when providing params exceeding allowed query size.   
     */
    async exportPost1(requestParameters: ExportPost1Request, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<object> {
        const response = await this.exportPost1Raw(requestParameters, initOverrides);
        return await response.value();
    }

}

/**
 * @export
 */
export const Export1FormatEnum = {
    Json: 'JSON',
    Xliff: 'XLIFF'
} as const;
export type Export1FormatEnum = typeof Export1FormatEnum[keyof typeof Export1FormatEnum];
/**
 * @export
 */
export const Export1FilterStateEnum = {
    Untranslated: 'UNTRANSLATED',
    Translated: 'TRANSLATED',
    Reviewed: 'REVIEWED'
} as const;
export type Export1FilterStateEnum = typeof Export1FilterStateEnum[keyof typeof Export1FilterStateEnum];
