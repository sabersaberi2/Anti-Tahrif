// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { CoreApp } from '@services/app';
import { CoreLang } from '@services/lang';
import { CoreError } from '@classes/errors/error';
import { makeSingleton, Translate } from '@singletons/core.singletons';
import { CoreWSExternalFile } from '@services/ws';
import { Locutus } from '@singletons/locutus';

/**
 * Different type of errors the app can treat.
 */
export type CoreTextErrorObject = {
    message?: string;
    error?: string;
    content?: string;
    body?: string;
    debuginfo?: string;
    backtrace?: string;
};

/*
 * "Utils" service with helper functions for text.
*/
@Injectable()
export class CoreTextUtilsProvider {

    // List of regular expressions to convert the old nomenclature to new nomenclature for disabled features.
    protected readonly DISABLED_FEATURES_COMPAT_REGEXPS: { old: RegExp; new: string }[] = [
        { old: /\$mmLoginEmailSignup/g, new: 'CoreLoginEmailSignup' },
        { old: /\$mmSideMenuDelegate/g, new: 'CoreMainMenuDelegate' },
        { old: /\$mmCoursesDelegate/g, new: 'CoreCourseOptionsDelegate' },
        { old: /\$mmUserDelegate/g, new: 'CoreUserDelegate' },
        { old: /\$mmCourseDelegate/g, new: 'CoreCourseModuleDelegate' },
        { old: /_mmCourses/g, new: '_CoreCourses' },
        { old: /_mmaFrontpage/g, new: '_CoreSiteHome' },
        { old: /_mmaGrades/g, new: '_CoreGrades' },
        { old: /_mmaCompetency/g, new: '_AddonCompetency' },
        { old: /_mmaNotifications/g, new: '_AddonNotifications' },
        { old: /_mmaMessages/g, new: '_AddonMessages' },
        { old: /_mmaCalendar/g, new: '_AddonCalendar' },
        { old: /_mmaFiles/g, new: '_AddonFiles' },
        { old: /_mmaParticipants/g, new: '_CoreUserParticipants' },
        { old: /_mmaCourseCompletion/g, new: '_AddonCourseCompletion' },
        { old: /_mmaNotes/g, new: '_AddonNotes' },
        { old: /_mmaBadges/g, new: '_AddonBadges' },
        { old: /files_privatefiles/g, new: 'AddonFilesPrivateFiles' },
        { old: /files_sitefiles/g, new: 'AddonFilesSiteFiles' },
        { old: /files_upload/g, new: 'AddonFilesUpload' },
        { old: /_mmaModAssign/g, new: '_AddonModAssign' },
        { old: /_mmaModBook/g, new: '_AddonModBook' },
        { old: /_mmaModChat/g, new: '_AddonModChat' },
        { old: /_mmaModChoice/g, new: '_AddonModChoice' },
        { old: /_mmaModData/g, new: '_AddonModData' },
        { old: /_mmaModFeedback/g, new: '_AddonModFeedback' },
        { old: /_mmaModFolder/g, new: '_AddonModFolder' },
        { old: /_mmaModForum/g, new: '_AddonModForum' },
        { old: /_mmaModGlossary/g, new: '_AddonModGlossary' },
        { old: /_mmaModH5pactivity/g, new: '_AddonModH5PActivity' },
        { old: /_mmaModImscp/g, new: '_AddonModImscp' },
        { old: /_mmaModLabel/g, new: '_AddonModLabel' },
        { old: /_mmaModLesson/g, new: '_AddonModLesson' },
        { old: /_mmaModLti/g, new: '_AddonModLti' },
        { old: /_mmaModPage/g, new: '_AddonModPage' },
        { old: /_mmaModQuiz/g, new: '_AddonModQuiz' },
        { old: /_mmaModResource/g, new: '_AddonModResource' },
        { old: /_mmaModScorm/g, new: '_AddonModScorm' },
        { old: /_mmaModSurvey/g, new: '_AddonModSurvey' },
        { old: /_mmaModUrl/g, new: '_AddonModUrl' },
        { old: /_mmaModWiki/g, new: '_AddonModWiki' },
        { old: /_mmaModWorkshop/g, new: '_AddonModWorkshop' },
        { old: /remoteAddOn_/g, new: 'sitePlugin_' },
    ];

    protected template: HTMLTemplateElement = document.createElement('template'); // A template element to convert HTML to element.

    constructor(private sanitizer: DomSanitizer) { }

    /**
     * Add ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    addEndingSlash(text: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) != '/') {
            return text + '/';
        }

        return text;
    }

    /**
     * Add some text to an error message.
     *
     * @param error Error message or object.
     * @param text Text to add.
     * @return Modified error.
     */
    addTextToError(error: string | CoreTextErrorObject, text: string): string | CoreTextErrorObject {
        if (typeof error == 'string') {
            return error + text;
        }

        if (error) {
            if (typeof error.message == 'string') {
                error.message += text;
            } else if (typeof error.error == 'string') {
                error.error += text;
            } else if (typeof error.content == 'string') {
                error.content += text;
            } else if (typeof error.body == 'string') {
                error.body += text;
            }
        }

        return error;
    }

    /**
     * Given an address as a string, return a URL to open the address in maps.
     *
     * @param address The address.
     * @return URL to view the address.
     */
    buildAddressURL(address: string): SafeUrl {
        return this.sanitizer.bypassSecurityTrustUrl((CoreApp.instance.isAndroid() ? 'geo:0,0?q=' : 'http://maps.google.com?q=') +
                encodeURIComponent(address));
    }

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @param messages Messages to show.
     * @return Message with all the messages.
     */
    buildMessage(messages: string[]): string {
        let result = '';

        messages.forEach((message) => {
            if (message) {
                result += `<p>${message}</p>`;
            }
        });

        return result;
    }

    /**
     * Build a message with several paragraphs.
     *
     * @param paragraphs List of paragraphs.
     * @return Built message.
     */
    buildSeveralParagraphsMessage(paragraphs: (string | CoreTextErrorObject)[]): string {
        // Filter invalid messages, and convert them to messages in case they're errors.
        const messages: string[] = [];

        paragraphs.forEach(paragraph => {
            // If it's an error, get its message.
            const message = this.getErrorMessageFromError(paragraph);

            if (paragraph && message) {
                messages.push(message);
            }
        });

        if (messages.length < 2) {
            return messages[0] || '';
        }

        let builtMessage = messages[0];

        for (let i = 1; i < messages.length; i++) {
            builtMessage = Translate.instance.instant('core.twoparagraphs', { p1: builtMessage, p2: messages[i] });
        }

        return builtMessage;
    }

    /**
     * Convert size in bytes into human readable format
     *
     * @param bytes Number of bytes to convert.
     * @param precision Number of digits after the decimal separator.
     * @return Size in human readable format.
     */
    bytesToSize(bytes: number, precision: number = 2): string {
        if (typeof bytes == 'undefined' || bytes === null || bytes < 0) {
            return Translate.instance.instant('core.notapplicable');
        }

        if (precision < 0) {
            precision = 2;
        }

        const keys = ['core.sizeb', 'core.sizekb', 'core.sizemb', 'core.sizegb', 'core.sizetb'];
        const units = Translate.instance.instant(keys);
        let pos = 0;

        if (bytes >= 1024) {
            while (bytes >= 1024) {
                pos++;
                bytes = bytes / 1024;
            }
            // Round to "precision" decimals if needed.
            bytes = Number(Math.round(parseFloat(bytes + 'e+' + precision)) + 'e-' + precision);
        }

        return Translate.instance.instant('core.humanreadablesize', { size: bytes, unit: units[keys[pos]] });
    }

    /**
     * Clean HTML tags.
     *
     * @param text The text to be cleaned.
     * @param singleLine True if new lines should be removed (all the text in a single line).
     * @return Clean text.
     */
    cleanTags(text: string, singleLine?: boolean): string {
        if (typeof text != 'string') {
            return text;
        }

        if (!text) {
            return '';
        }

        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig, '');
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        text = this.convertToElement(text).textContent!;
        // Recover or remove new lines.
        text = this.replaceNewLines(text, singleLine ? ' ' : '<br>');

        return text;
    }

    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param leftPath Left path.
     * @param rightPath Right path.
     * @return Concatenated path.
     */
    concatenatePaths(leftPath: string, rightPath: string): string {
        if (!leftPath) {
            return rightPath;
        } else if (!rightPath) {
            return leftPath;
        }

        const lastCharLeft = leftPath.slice(-1);
        const firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substr(1);
        } else if (lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    }

    /**
     * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
     * This function is the same as in DomUtils, but we cannot use that one because of circular dependencies.
     *
     * @param html Text to convert.
     * @return Element.
     */
    protected convertToElement(html: string): HTMLElement {
        // Add a div to hold the content, that's the element that will be returned.
        this.template.innerHTML = '<div>' + html + '</div>';

        return <HTMLElement> this.template.content.children[0];
    }

    /**
     * Count words in a text.
     *
     * @param text Text to count.
     * @return Number of words.
     */
    countWords(text: string): number {
        if (!text || typeof text != 'string') {
            return 0;
        }
        const blockTags = ['address', 'article', 'aside', 'blockquote', 'br', ' details', 'dialog', 'dd', 'div', 'dl', 'dt',
            'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
            'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'];

        // Clean HTML scripts and tags.
        text = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        // Replace block tags by space to get word count aware of line break and remove inline tags.
        text = text.replace(/<(\/[ ]*)?([a-zA-Z0-9]+)[^>]*>/gi, (str, p1, match) => {
            if (blockTags.indexOf(match) >= 0) {
                return ' ';
            }

            return '';
        });
        // Decode HTML entities.
        text = this.decodeHTMLEntities(text);
        // Replace underscores (which are classed as word characters) with spaces.
        text = text.replace(/_/gi, ' ');

        // This RegEx will detect any word change including Unicode chars. Some languages without spaces won't be counted fine.
        return text.match(/\S+/gi)?.length || 0;
    }

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @param text Text to decode.
     * @return Decoded text.
     */
    decodeHTML(text: string | number): string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, '\'')
            .replace(/&nbsp;/g, ' ');
    }

    /**
     * Decode HTML entities in a text. Equivalent to PHP html_entity_decode.
     *
     * @param text Text to decode.
     * @return Decoded text.
     */
    decodeHTMLEntities(text: string): string {
        if (text) {
            text = this.convertToElement(text).textContent!;
        }

        return text;
    }

    /**
     * Same as Javascript's decodeURI, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @return Decoded URI, or original URI if an exception is thrown.
     */
    decodeURI(uri: string): string {
        try {
            return decodeURI(uri);
        } catch (ex) {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Same as Javascript's decodeURIComponent, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @return Decoded URI, or original URI if an exception is thrown.
     */
    decodeURIComponent(uri: string): string {
        try {
            return decodeURIComponent(uri);
        } catch (ex) {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @param text Text to escape.
     * @return Escaped text.
     */
    escapeForRegex(text: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @param text Text to escape.
     * @param doubleEncode If false, it will not convert existing html entities. Defaults to true.
     * @return Escaped text.
     */
    escapeHTML(text: string | number, doubleEncode: boolean = true): string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        if (doubleEncode) {
            text = text.replace(/&/g, '&amp;');
        } else {
            text = text.replace(/&(?!amp;)(?!lt;)(?!gt;)(?!quot;)(?!#039;)/g, '&amp;');
        }

        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Shows a text on a new page.
     *
     * @param title Title of the new state.
     * @param text Content of the text to be expanded.
     * @param component Component to link the embedded files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param files List of files to display along with the text.
     * @param filter Whether the text should be filtered.
     * @param contextLevel The context level.
     * @param instanceId The instance ID related to the context.
     * @param courseId Course ID the text belongs to. It can be used to improve performance with filters.
     * @deprecated since 3.8.3. Please use viewText instead.
     */
    expandText(
        title: string,
        text: string,
        component?: string,
        componentId?: string | number,
        files?: CoreWSExternalFile[],
        filter?: boolean,
        contextLevel?: string,
        instanceId?: number,
        courseId?: number,
    ): void {
        return this.viewText(title, text, {
            component,
            componentId,
            files,
            filter,
            contextLevel,
            instanceId,
            courseId,
        });
    }

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param text Text to format.
     * @return Formatted text.
     */
    formatHtmlLines(text: string): string {
        const hasHTMLTags = this.hasHTMLTags(text);
        if (text.indexOf('<p>') == -1) {
            // Wrap the text in <p> tags.
            text = '<p>' + text + '</p>';
        }

        if (!hasHTMLTags) {
            // The text doesn't have HTML, replace new lines for <br>.
            return this.replaceNewLines(text, '<br>');
        }

        return text;
    }

    /**
     * Formats a text, treating multilang tags and cleaning HTML if needed.
     *
     * @param text Text to format.
     * @param clean Whether HTML tags should be removed.
     * @param singleLine Whether new lines should be removed. Only valid if clean is true.
     * @param shortenLength Number of characters to shorten the text.
     * @param highlight Text to highlight.
     * @return Promise resolved with the formatted text.
     * @deprecated since 3.8.0. Please use CoreFilterProvider.formatText instead.
     */
    formatText(text: string, clean?: boolean, singleLine?: boolean, shortenLength?: number, highlight?: string): Promise<string> {
        return this.treatMultilangTags(text).then((formatted) => {
            if (clean) {
                formatted = this.cleanTags(formatted, singleLine);
            }
            if (shortenLength && shortenLength > 0) {
                formatted = this.shortenText(formatted, shortenLength);
            }
            if (highlight) {
                formatted = this.highlightText(formatted, highlight);
            }

            return formatted;
        });
    }

    /**
     * Get the error message from an error object.
     *
     * @param error Error object.
     * @return Error message, undefined if not found.
     */
    getErrorMessageFromError(error?: string | CoreError | CoreTextErrorObject): string | undefined {
        if (typeof error == 'string') {
            return error;
        }

        if (error instanceof CoreError) {
            return error.message;
        }

        return error && (error.message || error.error || error.content || error.body);
    }

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @param files Files to extract the URL from. They need to have the URL in a 'url' or 'fileurl' attribute.
     * @return Pluginfile URL, undefined if no files found.
     */
    getTextPluginfileUrl(files: CoreWSExternalFile[]): string | undefined {
        if (files?.length) {
            const url = files[0].fileurl;

            // Remove text after last slash (encoded or not).
            return url?.substr(0, Math.max(url.lastIndexOf('/'), url.lastIndexOf('%2F')));
        }

        return undefined;
    }

    /**
     * Check if a text contains HTML tags.
     *
     * @param text Text to check.
     * @return Whether it has HTML tags.
     */
    hasHTMLTags(text: string): boolean {
        return /<[a-z][\s\S]*>/i.test(text);
    }

    /**
     * Highlight all occurrences of a certain text inside another text. It will add some HTML code to highlight it.
     *
     * @param text Full text.
     * @param searchText Text to search and highlight.
     * @return Highlighted text.
     */
    highlightText(text: string, searchText: string): string {
        if (!text || typeof text != 'string') {
            return '';
        } else if (!searchText) {
            return text;
        }

        const regex = new RegExp('(' + searchText + ')', 'gi');

        return text.replace(regex, '<span class="matchtext">$1</span>');
    }

    /**
     * Check if HTML content is blank.
     *
     * @param content HTML content.
     * @return True if the string does not contain actual content: text, images, etc.
     */
    htmlIsBlank(content: string): boolean {
        if (!content) {
            return true;
        }

        this.template.innerHTML = content;

        return this.template.content.textContent == '' && this.template.content.querySelector('img, object, hr') === null;
    }

    /**
     * Check if a text contains Unicode long chars.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @return True if has Unicode chars, false otherwise.
     */
    hasUnicode(text: string): boolean {
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) > 55295) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if an object has any long Unicode char.
     *
     * @param data Object to be checked.
     * @return If the data has any long Unicode char on it.
     */
    hasUnicodeData(data: Record<string, unknown>): boolean {
        for (const el in data) {
            if (typeof data[el] == 'object') {
                if (this.hasUnicodeData(data[el] as Record<string, unknown>)) {
                    return true;
                }

                continue;
            }

            if (typeof data[el] == 'string' && this.hasUnicode(data[el] as string)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param json JSON text.
     * @param defaultValue Default value to return if the parse fails. Defaults to the original value.
     * @param logErrorFn An error to call with the exception to log the error. If not supplied, no error.
     * @return JSON parsed as object or what it gets.
     */
    parseJSON<T>(json: string, defaultValue?: T, logErrorFn?: (error?: Error) => void): T | string {
        try {
            return JSON.parse(json);
        } catch (error) {
            // Error, log the error if needed.
            if (logErrorFn) {
                logErrorFn(error);
            }
        }

        // Error parsing, return the default value or the original value.
        return typeof defaultValue != 'undefined' ? defaultValue : json;
    }

    /**
     * Remove ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    removeEndingSlash(text: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) == '/') {
            return text.substr(0, text.length - 1);
        }

        return text;
    }

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    removeSpecialCharactersForFiles(text: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/[#:/?\\]+/g, '_');
    }

    /**
     * Replace all the new lines on a certain text.
     *
     * @param text The text to be treated.
     * @param newValue Text to use instead of new lines.
     * @return Treated text.
     */
    replaceNewLines(text: string, newValue: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/(?:\r\n|\r|\n)/g, newValue);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @param Text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return Treated text.
     */
    replacePluginfileUrls(text: string, files: CoreWSExternalFile[]): string {
        if (text && typeof text == 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(/@@PLUGINFILE@@/g, fileURL);
            }
        }

        return text;
    }

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @param text Text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return Treated text.
     */
    restorePluginfileUrls(text: string, files: CoreWSExternalFile[]): string {
        if (text && typeof text == 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(new RegExp(this.escapeForRegex(fileURL), 'g'), '@@PLUGINFILE@@');
            }
        }

        return text;
    }

    /**
     * Rounds a number to use a certain amout of decimals or less.
     * Difference between this function and float's toFixed:
     * 7.toFixed(2) -> 7.00
     * roundToDecimals(7, 2) -> 7
     *
     * @param num Number to round.
     * @param decimals Number of decimals. By default, 2.
     * @return Rounded number.
     */
    roundToDecimals(num: number, decimals: number = 2): number {
        const multiplier = Math.pow(10, decimals);

        return Math.round(num * multiplier) / multiplier;
    }

    /**
     * Add quotes to HTML characters.
     *
     * Returns text with HTML characters (like "<", ">", etc.) properly quoted.
     * Based on Moodle's s() function.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    s(text: string): string {
        if (!text) {
            return '';
        }

        return this.escapeHTML(text).replace(/&amp;#(\d+|x[0-9a-f]+);/i, '&#$1;');
    }

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @param text The text to be shortened.
     * @param length The desired length.
     * @return Shortened text.
     */
    shortenText(text: string, length: number): string {
        if (text.length > length) {
            text = text.substr(0, length);

            // Now, truncate at the last word boundary (if exists).
            const lastWordPos = text.lastIndexOf(' ');
            if (lastWordPos > 0) {
                text = text.substr(0, lastWordPos);
            }
            text += '&hellip;';
        }

        return text;
    }

    /**
     * Strip Unicode long char of a given text.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @return Without the Unicode chars.
     */
    stripUnicode(text: string): string {
        let stripped = '';
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) <= 55295) {
                stripped += text.charAt(x);
            }
        }

        return stripped;
    }

    /**
     * Replace text within a portion of a string. Equivalent to PHP's substr_replace.
     *
     * @param str The string to treat.
     * @param replace The value to put inside the string.
     * @param start The index where to start putting the new string. If negative, it will count from the end of the string.
     * @param length Length of the portion of string which is to be replaced. If negative, it represents the number of characters
     *               from the end of string at which to stop replacing. If not provided, replace until the end of the string.
     * @return Treated string.
     */
    substrReplace(str: string, replace: string, start: number, length?: number): string {
        return Locutus.substrReplace(str, replace, start, length);
    }

    /**
     * Treat the list of disabled features, replacing old nomenclature with the new one.
     *
     * @param features List of disabled features.
     * @return Treated list.
     */
    treatDisabledFeatures(features: string): string {
        if (!features) {
            return '';
        }

        for (let i = 0; i < this.DISABLED_FEATURES_COMPAT_REGEXPS.length; i++) {
            const entry = this.DISABLED_FEATURES_COMPAT_REGEXPS[i];

            features = features.replace(entry.old, entry.new);
        }

        return features;
    }

    /**
     * Treat the multilang tags from a HTML code, leaving only the current language.
     *
     * @param text The text to be treated.
     * @return Promise resolved with the formatted text.
     * @deprecated since 3.8.0. Now this is handled by AddonFilterMultilangHandler.
     */
    treatMultilangTags(text: string): Promise<string> {
        if (!text || typeof text != 'string') {
            return Promise.resolve('');
        }

        return CoreLang.instance.getCurrentLanguage().then((language) => {
            // Match the current language.
            const anyLangRegEx = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;
            let currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)</(?:lang|span)>', 'g');

            if (!text.match(currentLangRegEx)) {
                // Current lang not found. Try to find the first language.
                const matches = text.match(anyLangRegEx);
                if (matches && matches[0]) {
                    language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)![1];
                    currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)</(?:lang|span)>', 'g');
                } else {
                    // No multi-lang tag found, stop.
                    return text;
                }
            }
            // Extract contents of current language.
            text = text.replace(currentLangRegEx, '$1');
            // Delete the rest of languages
            text = text.replace(anyLangRegEx, '');

            return text;
        });
    }

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @param num Number to convert.
     * @return Number with leading zeros.
     */
    twoDigits(num: string | number): string {
        if (num < 10) {
            return '0' + num;
        } else {
            return '' + num; // Convert to string for coherence.
        }
    }

    /**
     * Make a string's first character uppercase.
     *
     * @param text Text to treat.
     * @return Treated text.
     */
    ucFirst(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Unserialize Array from PHP.
     *
     * @param data String to unserialize.
     * @return Unserialized data.
     */
    unserialize<T = unknown>(data: string): T {
        return Locutus.unserialize<T>(data);
    }

    /**
     * Shows a text on a new page.
     *
     * @param title Title of the new state.
     * @param text Content of the text to be expanded.
     * @param component Component to link the embedded files to.
     * @param options Options.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    viewText(title: string, text: string, options?: CoreTextUtilsViewTextOptions): void {
        // @todo
    }

}

/**
 * Options for viewText.
 */
export type CoreTextUtilsViewTextOptions = {
    component?: string; // Component to link the embedded files to.
    componentId?: string | number; // An ID to use in conjunction with the component.
    files?: CoreWSExternalFile[]; // List of files to display along with the text.
    filter?: boolean; // Whether the text should be filtered.
    contextLevel?: string; // The context level.
    instanceId?: number; // The instance ID related to the context.
    courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    displayCopyButton?: boolean; // Whether to display a button to copy the text.
    // modalOptions?: ModalOptions; // Modal options. @todo
};

export class CoreTextUtils extends makeSingleton(CoreTextUtilsProvider) {}
