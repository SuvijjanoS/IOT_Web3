// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeviceRegistry
 * @dev Smart contract for registering IoT devices with blockchain IDs and wallet addresses
 * Each device gets a stable bytes32 deviceId and an associated wallet address
 */
contract DeviceRegistry {
    struct Device {
        address wallet;
        bytes32 fingerprint; // same as deviceId or some hw fingerprint
        bool isActive;
    }

    mapping(bytes32 => Device) public devices; // deviceId => Device
    address public admin;

    event DeviceRegistered(bytes32 indexed deviceId, address wallet);
    event DeviceStatusChanged(bytes32 indexed deviceId, bool isActive);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    /**
     * @dev Register a new device
     * @param deviceId The unique device identifier (bytes32, computed off-chain)
     * @param wallet The wallet address associated with this device
     * @param fingerprint The hardware fingerprint (can be same as deviceId)
     */
    function registerDevice(
        bytes32 deviceId,
        address wallet,
        bytes32 fingerprint
    ) external onlyAdmin {
        require(devices[deviceId].wallet == address(0), "already registered");
        require(wallet != address(0), "invalid wallet address");
        devices[deviceId] = Device(wallet, fingerprint, true);
        emit DeviceRegistered(deviceId, wallet);
    }

    /**
     * @dev Set device active/inactive status
     * @param deviceId The device identifier
     * @param active True to activate, false to deactivate
     */
    function setDeviceStatus(bytes32 deviceId, bool active) external onlyAdmin {
        require(devices[deviceId].wallet != address(0), "unknown device");
        devices[deviceId].isActive = active;
        emit DeviceStatusChanged(deviceId, active);
    }

    /**
     * @dev Get device information
     * @param deviceId The device identifier
     * @return wallet The device wallet address
     * @return fingerprint The device fingerprint
     * @return isActive Whether the device is active
     */
    function getDevice(bytes32 deviceId) external view returns (
        address wallet,
        bytes32 fingerprint,
        bool isActive
    ) {
        Device memory device = devices[deviceId];
        return (device.wallet, device.fingerprint, device.isActive);
    }
}

