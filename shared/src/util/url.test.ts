import assert from 'assert'
import { buildSearchURLQuery, makeRepoURI, parseHash, parseRepoURI, toPrettyBlobURL } from './url'

/**
 * Asserts deep object equality using node's assert.deepEqual, except it (1) ignores differences in the
 * prototype (because that causes 2 object literals to fail the test) and (2) treats undefined properties as
 * missing.
 */
function assertDeepStrictEqual(actual: any, expected: any, message?: string): void {
    actual = JSON.parse(JSON.stringify(actual))
    expected = JSON.parse(JSON.stringify(expected))
    expect(actual).toEqual(expected)
}

describe('parseRepoURI', () => {
    test('should parse repo', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
        })
    })

    test('should parse repo with rev', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?branch')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
        })
    })

    test('should parse repo with commitID', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?24fca303ac6da784b9e8269f724ddeb0b2eea5e7')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: '24fca303ac6da784b9e8269f724ddeb0b2eea5e7',
            commitID: '24fca303ac6da784b9e8269f724ddeb0b2eea5e7',
        })
    })

    test('should parse repo with rev and file', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?branch#mux.go')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
        })
    })

    test('should parse repo with rev and file and line', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?branch#mux.go:3')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
            position: {
                line: 3,
                character: 0,
            },
        })
    })

    test('should parse repo with rev and file and position', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?branch#mux.go:3,5')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
            position: {
                line: 3,
                character: 5,
            },
        })
    })

    test('should parse repo with rev and file and range', () => {
        const parsed = parseRepoURI('git://github.com/gorilla/mux?branch#mux.go:3,5-6,9')
        assertDeepStrictEqual(parsed, {
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
            range: {
                start: {
                    line: 3,
                    character: 5,
                },
                end: {
                    line: 6,
                    character: 9,
                },
            },
        })
    })
})

describe('makeRepoURI', () => {
    test('should make repo', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux')
    })

    test('should make repo with rev', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux?branch')
    })

    test('should make repo with commitID', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            commitID: '24fca303ac6da784b9e8269f724ddeb0b2eea5e7',
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux?24fca303ac6da784b9e8269f724ddeb0b2eea5e7')
    })

    test('should make repo with rev and file', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux?branch#mux.go')
    })

    test('should make repo with rev and file and line', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
            position: {
                line: 3,
                character: 0,
            },
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux?branch#mux.go:3')
    })

    test('should make repo with rev and file and position', () => {
        const uri = makeRepoURI({
            repoName: 'github.com/gorilla/mux',
            rev: 'branch',
            filePath: 'mux.go',
            position: {
                line: 3,
                character: 5,
            },
        })
        assertDeepStrictEqual(uri, 'git://github.com/gorilla/mux?branch#mux.go:3,5')
    })
})

describe('util/url', () => {
    const linePosition = { line: 1 }
    const lineCharPosition = { line: 1, character: 1 }
    const refMode = { ...lineCharPosition, viewState: 'references' }
    const ctx = {
        repoName: 'github.com/gorilla/mux',
        rev: '',
        commitID: '24fca303ac6da784b9e8269f724ddeb0b2eea5e7',
        filePath: 'mux.go',
    }

    describe('parseHash', () => {
        test('parses empty hash', () => {
            expect(parseHash('')).toEqual({})
        })

        test('parses unexpectedly formatted hash', () => {
            expect(parseHash('L-53')).toEqual({})
            expect(parseHash('L53:')).toEqual({})
            expect(parseHash('L1:2-')).toEqual({})
            expect(parseHash('L1:2-3')).toEqual({})
            expect(parseHash('L1:2-3:')).toEqual({})
            expect(parseHash('L1:-3:')).toEqual({})
            expect(parseHash('L1:-3:4')).toEqual({})
            expect(parseHash('L1-2:3')).toEqual({})
            expect(parseHash('L1-2:')).toEqual({})
            expect(parseHash('L1:-2')).toEqual({})
            expect(parseHash('L1:2--3:4')).toEqual({})
            expect(parseHash('L53:a')).toEqual({})
        })

        test('parses hash with leading octothorpe', () => {
            expect(parseHash('#L1')).toEqual(linePosition)
        })

        test('parses hash with line', () => {
            expect(parseHash('L1')).toEqual(linePosition)
        })

        test('parses hash with line and character', () => {
            expect(parseHash('L1:1')).toEqual(lineCharPosition)
        })

        test('parses hash with range', () => {
            expect(parseHash('L1-2')).toEqual({ line: 1, endLine: 2 })
            expect(parseHash('L1:2-3:4')).toEqual({ line: 1, character: 2, endLine: 3, endCharacter: 4 })
        })

        test('parses hash with references', () => {
            expect(parseHash('$references')).toEqual({ viewState: 'references' })
            expect(parseHash('L1:1$references')).toEqual(refMode)
            expect(parseHash('L1:1$references')).toEqual(refMode)
        })
        test('parses modern hash with references', () => {
            expect(parseHash('tab=references')).toEqual({ viewState: 'references' })
            expect(parseHash('L1:1&tab=references')).toEqual(refMode)
            expect(parseHash('L1:1&tab=references')).toEqual(refMode)
        })
    })

    describe('toPrettyBlobURL', () => {
        test('formats url for empty rev', () => {
            expect(toPrettyBlobURL(ctx)).toBe('/github.com/gorilla/mux/-/blob/mux.go')
        })

        test('formats url for specified rev', () => {
            expect(toPrettyBlobURL({ ...ctx, rev: 'branch' })).toBe('/github.com/gorilla/mux@branch/-/blob/mux.go')
        })

        test('formats url with position', () => {
            expect(toPrettyBlobURL({ ...ctx, position: lineCharPosition })).toBe(
                '/github.com/gorilla/mux/-/blob/mux.go#L1:1'
            )
        })

        test('formats url with view state', () => {
            expect(toPrettyBlobURL({ ...ctx, position: lineCharPosition, viewState: 'references' })).toBe(
                '/github.com/gorilla/mux/-/blob/mux.go#L1:1&tab=references'
            )
        })
    })
})

describe('buildSearchURLQuery', () => {
    it('builds the URL query for a search', () => assert.strictEqual(buildSearchURLQuery('foo'), 'q=foo'))
    it('handles an empty query', () => assert.strictEqual(buildSearchURLQuery(''), 'q='))
    it('handles characters that need encoding', () =>
        assert.strictEqual(buildSearchURLQuery('foo bar%baz'), 'q=foo+bar%25baz'))
    it('preserves / and : for readability', () =>
        assert.strictEqual(buildSearchURLQuery('repo:foo/bar'), 'q=repo:foo/bar'))
})
