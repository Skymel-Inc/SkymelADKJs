export class CommonValidators {
    constructor() {
        throw new Error("Cannot instantiate this class. It has purely static methods, " +
            "please call them using class-name scope,such as `CommonValidators.classMethod(param)` etc.");
    }

    /**
     * Checks if the input is a function. Returns true if the input is a function, false otherwise.
     *
     * @param inputObject {*}
     * @returns {boolean}
     */
    static isMethod(inputObject) {
        return typeof inputObject === 'function';
    }

    /**
     * Checks if the input string is a non-empty string.
     *
     * @param inputString {*}
     * @returns {boolean}
     */
    static isNonEmptyString(inputString) {
        return typeof inputString === "string" && inputString.length > 0;
    }

    /**
     * Checks if the input string is an empty string.
     *
     * @param inputString {*}
     * @returns {boolean}
     */
    static isEmptyString(inputString) {
        return typeof inputString === "string" && inputString.length === 0;
    }

    /**
     * Checks if the input is a string. Returns true if the input is a string, false otherwise.
     *
     * @param inputString {*}
     * @returns {boolean}
     */
    static isString(inputString) {
        return typeof inputString === "string";
    }

    /**
     * Checks if the input is a number. Returns true if the input is a number, false otherwise.
     *
     * @param inputNumber {*}
     * @returns {boolean}
     */
    static isNumber(inputNumber) {
        return typeof inputNumber === 'number';
    }

    /**
     * Checks if the input is a boolean variable. Returns true if the input is a boolean, false otherwise.
     *
     * @param inputVariable {*}
     * @returns {boolean}
     */
    static isBoolean(inputVariable) {
        return typeof inputVariable === "boolean";
    }

    /**
     * Checks if the input is a valid date object. Returns true if the input is a valid date object, false otherwise.
     *
     * @param inputDate {*}
     * @returns {boolean}
     */
    static isValidDate(inputDate) {
        return inputDate instanceof Date && !isNaN(inputDate);
    }

    /**
     * Checks if the input is a valid date string. Returns true if the input is a valid date string, false otherwise.
     *
     * @param inputDateString {*}
     * @returns {boolean}
     */
    static isValidDateString(inputDateString) {
        return CommonValidators.isString(inputDateString) && !isNaN(Date.parse(inputDateString));
    }

    /**
     * Checks if the input is an array. Returns true if the input is an array, false otherwise.
     * Point to note, this static method checks for both JavaScript arrays and TypedArrays.
     *
     * @param inputObject
     * @returns {boolean}
     */
    static isArray(inputObject) {
        return CommonValidators.isJavascriptArray(inputObject) || CommonValidators.isTypedArray(inputObject);
    }

    /**
     * Checks if the input is a JavaScript array. Returns true if the input is a JavaScript array, false otherwise.
     *
     * @param inputObject
     * @returns {boolean}
     */
    static isJavascriptArray(inputObject) {
        return Array.isArray(inputObject);
    }

    /**
     * Checks if the input is a TypedArray. Returns true if the input is a TypedArray, false otherwise.
     *
     * @param inputObject {*}
     * @returns {boolean}
     */
    static isTypedArray(inputObject) {
        return ArrayBuffer.isView(inputObject);
    }

    /**
     * Checks if the input is a JavaScript dictionary. Returns true if the input is a JavaScript dictionary, false
     * otherwise.
     *
     * @param inputObject {*}
     * @returns {boolean}
     */
    static isDict(inputObject) {
        if (CommonValidators.isNullOrUndefined(inputObject) || CommonValidators.isArray(inputObject) ||
            typeof inputObject !== "object") {
            return false;
        }
        if (!('constructor' in inputObject && typeof inputObject.constructor === 'function')) {
            return false;
        }
        const constructorString = inputObject.constructor.toString();
        return (constructorString.length === 35 || constructorString.length === 39) &&
            constructorString.substring(0, 15) === "function Object";
    }

    /**
     * Checks if the input is empty. Returns true if the input is empty, false otherwise. The emptiness of the input for
     * different data-types is defined as follows:
     * 1. For strings, the input is empty if the length of the string is 0.
     * 2. For numbers, the input is empty if the number is 0.
     * 3. For booleans, the input is empty if the boolean is false.
     * 4. For arrays, the input is empty if the length of the array is 0.
     * 5. For dictionaries, the input is empty if the length of the dictionary is 0.
     * 6. For sets, the input is empty if the length of the set is 0.
     * 7. For TypedArrays, the input is empty if the length of the TypedArray is 0.
     * 8. For null and undefined, the input is empty.
     * 9. For all other data-types, the input is empty if it has a 'size' property and the size is 0.
     * 10. By default, anything else is non-empty.
     *
     * @param inputObject {*}
     * @returns {boolean}
     */

    static isEmpty(inputObject) {
        if (typeof inputObject === "boolean") {
            return !inputObject;
        }
        if (typeof inputObject === 'undefined' || inputObject === null) {
            return true;
        }
        if (CommonValidators.isArray(inputObject) || CommonValidators.isDict(inputObject)) {
            return Object.keys(inputObject).length === 0;
        }
        if (CommonValidators.isString(inputObject)) {
            return inputObject.length === 0;
        }
        if (CommonValidators.isNumber(inputObject)) {
            return inputObject === 0;
        }
        if ('size' in inputObject) {
            return inputObject.size === 0;
        }
        return false;
    }

    /**
     * Checks if the `inputDict` is a non-empty dictionary and has `keyName` as a key. Returns true if `inputDict` is a
     * dictionary and has `keyName` as a key, false otherwise. The return is also false if `keyName` is not a string.
     *
     * @param inputDict {*}
     * @param keyName {string} The key whose existence is being checked for.
     * @returns {boolean}
     */
    static isNotEmptyDictAndHasKey(inputDict, keyName) {
        return !CommonValidators.isEmpty(inputDict) && CommonValidators.isDict(inputDict) &&
            CommonValidators.isString(keyName) && keyName in inputDict;
    }

    /**
     * Retrieves the value associated with `keyName` from `inputDict` if `keyName` is present in `inputDict`.
     * Returns `defaultValue`` if `keyName` is not present in `inputDict` or `inputDict` is not a dictionary.
     *
     * @param inputDict {*}
     * @param keyName {string}
     * @param defaultValue {*}
     * @returns {*|null}
     */
    static getKeyValueFromDictIfKeyAbsentReturnDefault(inputDict, keyName, defaultValue = null) {
        if (CommonValidators.isNotEmptyDictAndHasKey(inputDict, keyName)) {
            return inputDict[keyName];
        }
        return defaultValue;
    }

    /**
     * Checks if the `input_object` is a non-empty object and contains `memberName` as a property/method.
     * @param inputObject {*} This is expected to be a JavaScript object or a dictionary.
     * @param memberName {string}
     * @returns {boolean}
     */
    static isNotEmptyObjectAndHasMember(inputObject, memberName) {
        if (CommonValidators.isEmpty(inputObject)) {
            return false
        }
        if (!CommonValidators.isNonEmptyString(memberName)) {
            throw new Error("Invalid memberName passed.")
        }
        if (CommonValidators.isString(inputObject) || CommonValidators.isNumber(inputObject)) {
            return false;
        }
        if (memberName in inputObject) {
            return true;
        }
        return inputObject.hasOwnProperty(memberName);
    }

    /**
     * Checks if the `inputRegexPatternString` is a valid JavaScript regex object.
     *
     * @param inputRegexPatternString {*}
     * @returns {boolean}
     */
    static isRegexPatternString(inputRegexPatternString) {
        if (CommonValidators.isEmpty(inputRegexPatternString)) {
            return false;
        }
        if (inputRegexPatternString instanceof RegExp) {
            return true;
        }
        return CommonValidators.isNotEmptyObjectAndHasMember(inputRegexPatternString, 'source') &&
            CommonValidators.isString(inputRegexPatternString.source);
    }

    /**
     * Checks if `inputString` is a valid string and matches the `regexPatternString`.
     *
     * @param inputString {string}
     * @param regexPatternString {RegExp|string}
     * @returns {*}
     */
    static isStringRegexMatch(inputString, regexPatternString) {
        if (!CommonValidators.isString(inputString)) {
            throw new Error("Provided inputString  is not a valid string.")
        }
        if (!CommonValidators.isRegexPatternString(regexPatternString)) {
            throw new Error("Provided regexPatternString is not a valid regex pattern string.")
        }
        return regexPatternString.test(inputString);
    }

    /**
     * Checks if `input_object` is a valid JavaScript set.
     * @param inputObject {*}
     * @returns {boolean}
     */
    static isSet(inputObject) {
        if (CommonValidators.isNullOrUndefined(inputObject)) {
            return false;
        }
        return inputObject instanceof Set;
    }

    /**
     * Return true if `input_object` is specifically null or undefined.
     *
     * @param inputObject {*}
     * @returns {boolean}
     */
    static isNullOrUndefined(inputObject) {
        return inputObject === null || typeof inputObject === "undefined";
    }

    static isImageType(obj) {
        return obj && typeof obj === 'object' && (
            obj.imageUrl !== undefined ||
            obj.imageBytes !== undefined ||
            obj.imageBase64 !== undefined
        );
    }
}