/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2016, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/


/**
 * Assert a test condition to be true.
 *
 * @param test - The test condition which must be true.
 *
 * @param message - The error message to use for a false condition.
 *
 * #### Notes
 * If the test is `false`, an error will be thrown.
 */
export
function assert(test: boolean, message = 'Assertion Failed!'): void {
  if (!test) throw new Error(message);
}


/**
 * Test whether a number is an integer.
 *
 * @param value - The number of interest.
 *
 * @returns `true` if the value is an integer, `false` otherwise.
 */
export
function isInt(value: number): boolean {
  return Math.floor(value) === value;
}