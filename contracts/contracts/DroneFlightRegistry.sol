// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DroneFlightRegistry
 * @dev Smart contract for recording drone flight logs on-chain
 * Stores keccak256 hashes of flight log data for tamper-proof verification
 */
contract DroneFlightRegistry {
    struct FlightRef {
        bytes32 logHash;        // keccak256 hash of the canonicalized flight log
        uint256 startedAt;      // UNIX timestamp of flight start
        string flightId;        // unique flight identifier
        string droneId;         // drone identifier
        string droneModel;      // e.g., "DJI Mavic 3"
        address recorder;       // who submitted
        uint256 samplesCount;   // number of samples in the flight
        uint256 durationS;      // flight duration in seconds
    }

    event FlightRecorded(
        string indexed flightId,
        string indexed droneId,
        uint256 indexed startedAt,
        bytes32 logHash,
        string droneModel,
        uint256 samplesCount,
        address recorder
    );

    mapping(bytes32 => FlightRef) public flightsByKey;
    mapping(string => bytes32[]) public flightsByDroneId; // drone_id -> array of flight keys

    /**
     * @dev Record a drone flight log
     * @param flightId Unique flight identifier
     * @param droneId The drone identifier
     * @param droneModel The drone model (e.g., "DJI Mavic 3")
     * @param startedAt UNIX timestamp of flight start
     * @param logHash keccak256 hash of the canonicalized flight log JSON
     * @param samplesCount Number of samples in the flight
     * @param durationS Flight duration in seconds
     */
    function recordFlight(
        string calldata flightId,
        string calldata droneId,
        string calldata droneModel,
        uint256 startedAt,
        bytes32 logHash,
        uint256 samplesCount,
        uint256 durationS
    ) external {
        bytes32 key = keccak256(abi.encodePacked(flightId, droneId, startedAt));
        
        require(flightsByKey[key].startedAt == 0, "Flight already recorded");
        
        flightsByKey[key] = FlightRef({
            logHash: logHash,
            startedAt: startedAt,
            flightId: flightId,
            droneId: droneId,
            droneModel: droneModel,
            recorder: msg.sender,
            samplesCount: samplesCount,
            durationS: durationS
        });

        flightsByDroneId[droneId].push(key);

        emit FlightRecorded(
            flightId,
            droneId,
            startedAt,
            logHash,
            droneModel,
            samplesCount,
            msg.sender
        );
    }

    /**
     * @dev Get a flight by flight ID, drone ID, and start time
     * @param flightId The flight identifier
     * @param droneId The drone identifier
     * @param startedAt UNIX timestamp of flight start
     * @return logHash The hash of the flight log data
     * @return startedAt The timestamp
     * @return flightId The flight ID
     * @return droneId The drone ID
     * @return droneModel The drone model
     * @return recorder The address that recorded this flight
     * @return samplesCount Number of samples
     * @return durationS Flight duration in seconds
     */
    function getFlight(
        string calldata flightId,
        string calldata droneId,
        uint256 startedAt
    ) external view returns (
        bytes32 logHash,
        uint256,
        string memory,
        string memory,
        string memory droneModel,
        address recorder,
        uint256 samplesCount,
        uint256 durationS
    ) {
        bytes32 key = keccak256(abi.encodePacked(flightId, droneId, startedAt));
        FlightRef memory flight = flightsByKey[key];
        require(flight.startedAt != 0, "Flight not found");
        return (
            flight.logHash,
            flight.startedAt,
            flight.flightId,
            flight.droneId,
            flight.droneModel,
            flight.recorder,
            flight.samplesCount,
            flight.durationS
        );
    }

    /**
     * @dev Get all flight keys for a drone
     * @param droneId The drone identifier
     * @return Array of flight keys
     */
    function getDroneFlights(string calldata droneId) external view returns (bytes32[] memory) {
        return flightsByDroneId[droneId];
    }
}

