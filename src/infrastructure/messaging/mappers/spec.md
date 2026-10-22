# Messaging Mappers

This folder holds messaging mappers that convert between incoming SQS wager requests and use case inputs, and between mediated wager outcomes and outbox integration events. Each mapper implements `MapperProtocol<Input, Output>`.
