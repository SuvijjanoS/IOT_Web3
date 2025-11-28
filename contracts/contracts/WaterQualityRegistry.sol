// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WaterQualityRegistry
 * @dev Smart contract for recording water quality sensor readings on-chain
 * Stores keccak256 hashes of sensor data for tamper-proof verification
 */
contract WaterQualityRegistry {
    struct ReadingRef {
        bytes32 dataHash;      // keccak256 hash of the JSON payload
        uint256 timestamp;     // UNIX seconds
        string sensorId;       // for convenience
        address recorder;      // who submitted
    }

    event ReadingRecorded(
        string indexed sensorId,
        uint256 indexed timestamp,
        bytes32 dataHash,
        address indexed recorder
    );

    event CommandRecorded(
        string indexed sensorId,
        string indexed relayId,
        string command,
        uint256 timestamp,
        bytes32 commandHash,
        address indexed recorder
    );

    mapping(bytes32 => ReadingRef) public readingsByKey;
    mapping(bytes32 => bytes32) public commandsByKey; // command hash -> data hash

    /**
     * @dev Record a water quality reading
     * @param sensorId The sensor identifier
     * @param timestamp UNIX timestamp of the reading
     * @param dataHash keccak256 hash of the JSON payload
     */
    function recordReading(
        string calldata sensorId,
        uint256 timestamp,
        bytes32 dataHash
    ) external {
        bytes32 key = keccak256(abi.encodePacked(sensorId, timestamp));
        readingsByKey[key] = ReadingRef({
            dataHash: dataHash,
            timestamp: timestamp,
            sensorId: sensorId,
            recorder: msg.sender
        });

        emit ReadingRecorded(sensorId, timestamp, dataHash, msg.sender);
    }

    /**
     * @dev Record a control command for auditability
     * @param sensorId The sensor/device identifier
     * @param relayId The relay/actuator identifier
     * @param command The command JSON string
     * @param timestamp UNIX timestamp of the command
     * @param commandHash keccak256 hash of the command JSON
     */
    function recordCommand(
        string calldata sensorId,
        string calldata relayId,
        string calldata command,
        uint256 timestamp,
        bytes32 commandHash
    ) external {
        bytes32 key = keccak256(abi.encodePacked(sensorId, relayId, timestamp));
        commandsByKey[key] = commandHash;

        emit CommandRecorded(sensorId, relayId, command, timestamp, commandHash, msg.sender);
    }

    /**
     * @dev Get a reading by sensor ID and timestamp
     * @param sensorId The sensor identifier
     * @param timestamp UNIX timestamp of the reading
     * @return dataHash The hash of the reading data
     * @return timestamp The timestamp
     * @return sensorId The sensor ID
     * @return recorder The address that recorded this reading
     */
    function getReading(
        string calldata sensorId,
        uint256 timestamp
    ) external view returns (
        bytes32 dataHash,
        uint256,
        string memory,
        address recorder
    ) {
        bytes32 key = keccak256(abi.encodePacked(sensorId, timestamp));
        ReadingRef memory reading = readingsByKey[key];
        return (reading.dataHash, reading.timestamp, reading.sensorId, reading.recorder);
    }
}

