import { AddBulkSentencesCommandHandler } from '../../../../../application/sentences/use-case/command-handler/add-bulk-sentences-command-handler'
import { either as E, taskEither as TE, identity as Id } from 'fp-ts'
import { readTsvIntoMemory } from '../../../../../infrastructure/parser/tsvParser'
import { AddBulkSentencesCommand } from '../../../../../application/sentences/use-case/command-handler/command/add-bulk-sentences-command'
import { constVoid, pipe } from 'fp-ts/lib/function'
import * as fs from 'fs'
import * as path from 'path'
import { Domain } from '../../../../../core/domains/domain'
import { Variant } from '../../../../../core/variants/variant'

const generalDomain: Domain = {
  id: 1,
  name: 'general',
  description: 'General',
}

const variant: Variant = {
  id: 1,
  locale: 'en',
  name: 'something',
  tag: 'en',
}

describe('Add bulk sentences command handler', () => {
  it('should parse and process the tsv file correctly', async () => {
    const fetchUserClientIdByEmailMock = jest.fn(() => TE.right('abc1234'))
    const fetchSentenceDomainsMock = jest.fn(() => TE.right([generalDomain]))
    const fetchVariantsMock = jest.fn(() => TE.right([variant]))
    const insertBulkSentencesMock = jest.fn(() => TE.right(constVoid()))
    const tsvFileReadable = fs.createReadStream(
      path.join(__dirname, 'sample-bulk-submission.tsv'),
      {
        encoding: 'utf-8',
      }
    )
    const cmd: AddBulkSentencesCommand = {
      email: 'hello@example.com',
      tsvFile: tsvFileReadable,
      localeId: 1,
    }

    const sut = pipe(
      AddBulkSentencesCommandHandler,
      Id.ap(readTsvIntoMemory),
      Id.ap(fetchUserClientIdByEmailMock),
      Id.ap(fetchSentenceDomainsMock),
      Id.ap(fetchVariantsMock),
      Id.ap(insertBulkSentencesMock)
    )

    await pipe(
      cmd,
      sut,
      TE.getOrElse(err => async () => console.log(err))
    )()

    expect(fetchUserClientIdByEmailMock).toBeCalledTimes(1)
    expect(fetchUserClientIdByEmailMock).toBeCalledWith(cmd.email)
    expect(insertBulkSentencesMock).toBeCalledTimes(1)
  })

  it('should not insert into the db if user id cannot be found', async () => {
    const fetchUserClientIdByEmailMock = jest.fn(() =>
      TE.left(new Error('Cannot find user with this email'))
    )
    const fetchSentenceDomainsMock = jest.fn(() => TE.right([generalDomain]))
    const insertBulkSentencesMock = jest.fn(() => TE.right(constVoid()))
    const fetchVariantsMock = jest.fn(() => TE.right([variant]))
    const tsvFileReadable = fs.createReadStream(
      path.join(__dirname, 'sample-bulk-submission.tsv'),
      {
        encoding: 'utf-8',
      }
    )
    const cmd: AddBulkSentencesCommand = {
      email: 'hello@example.com',
      tsvFile: tsvFileReadable,
      localeId: 1,
    }

    const sut = pipe(
      AddBulkSentencesCommandHandler,
      Id.ap(readTsvIntoMemory),
      Id.ap(fetchUserClientIdByEmailMock),
      Id.ap(fetchSentenceDomainsMock),
      Id.ap(fetchVariantsMock),
      Id.ap(insertBulkSentencesMock)
    )

    const result = await pipe(cmd, sut)()

    expect(fetchUserClientIdByEmailMock).toBeCalledTimes(1)
    expect(fetchUserClientIdByEmailMock).toBeCalledWith(cmd.email)
    expect(insertBulkSentencesMock).toBeCalledTimes(0)
    expect(E.isLeft(result)).toBe(true)
  })
})
