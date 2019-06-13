/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/
'use strict'

/**
 * @module src/models/transfer/facade/
 */

const Db = require('../../lib/db')
const Enum = require('../../lib/enum')
const Time = require('../../lib/time')

const saveBulkTransferReceived = async (payload, participants, stateReason = null, isValid = true) => {
  try {
    const bulkTransferRecord = {
      bulkTransferId: payload.bulkTransferId,
      bulkQuoteId: payload.bulkQuoteId,
      payerParticipantId: participants.payerParticipantId,
      payeeParticipantId: participants.payeeParticipantId,
      expirationDate: Time.getUTCString(new Date(payload.expiration))
    }
    const state = (isValid ? Enum.BulkTransferState.RECEIVED : Enum.BulkTransferState.INVALID)
    const bulkTransferStateChangeRecord = {
      bulkTransferId: payload.bulkTransferId,
      bulkTransferStateId: state,
      reason: stateReason
    }

    const knex = await Db.getKnex()
    return await knex.transaction(async (trx) => {
      try {
        await knex('bulkTransfer').transacting(trx).insert(bulkTransferRecord)
        if (payload.extensionList && payload.extensionList.extension) {
          let bulkTransferExtensionsRecordList = payload.extensionList.extension.map(ext => {
            return {
              bulkTransferId: payload.bulkTransferId,
              key: ext.key,
              value: ext.value
            }
          })
          await knex.batchInsert('bulkTransferExtension', bulkTransferExtensionsRecordList).transacting(trx)
        }
        // if (payload.individualTransfers) {
        //   let individualTransfersRecordList = payload.individualTransfers.map(t => {
        //     return {
        //       transferId: t.transferId,
        //       bulkTransferId: payload.bulkTransferId,
        //       bulkProcessingStateId: Enum.BulkProcessingState.RECEIVED
        //     }
        //   })
        //   await knex.batchInsert('bulkTransferAssociation', individualTransfersRecordList).transacting(trx)
        // }
        await knex('bulkTransferStateChange').transacting(trx).insert(bulkTransferStateChangeRecord)
        await trx.commit
      } catch (err) {
        await trx.rollback
        throw err
      }
    })
  } catch (e) {
    throw e
  }
}

const TransferFacade = {
  saveBulkTransferReceived
}

module.exports = TransferFacade