import assert from 'assert'
import { WorkspaceRoot } from 'sourcegraph'
import { URI } from '../extension/types/uri'
import { collectSubscribableValues, integrationTestContext } from './helpers.test'

describe('Workspace roots (integration)', () => {
    describe('workspace.roots', () => {
        test('lists roots', async () => {
            const { extensionHost } = await integrationTestContext()
            expect(extensionHost.workspace.roots).toEqual([{ uri: new URI('file:///') }] as WorkspaceRoot[])
        })

        test('adds new text documents', async () => {
            const { model, extensionHost } = await integrationTestContext()

            model.next({
                ...model.value,
                roots: [{ uri: 'file:///a' }, { uri: 'file:///b' }],
            })
            await extensionHost.internal.sync()

            expect(extensionHost.workspace.roots).toEqual([
                { uri: new URI('file:///a') },
                { uri: new URI('file:///b') },
            ] as WorkspaceRoot[])
        })
    })

    describe('workspace.onDidChangeRoots', () => {
        test('fires when a root is added or removed', async () => {
            const { model, extensionHost } = await integrationTestContext()

            const values = collectSubscribableValues(extensionHost.workspace.onDidChangeRoots)
            expect(values).toEqual([] as void[])

            model.next({
                ...model.value,
                roots: [{ uri: 'file:///a' }],
            })
            await extensionHost.internal.sync()

            expect(values).toEqual([void 0])
        })
    })
})
