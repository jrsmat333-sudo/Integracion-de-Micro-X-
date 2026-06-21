import * as signalR from '@microsoft/signalr';

const GATEWAY_HUB = 'https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/hub/notifications';

let connection = null;

export const startConnection = async () => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl(GATEWAY_HUB)
    .withAutomaticReconnect()
    .build();

  try {
    await connection.start();
    console.log('SignalR Connected.');
  } catch (err) {
    console.error('SignalR Connection Error: ', err);
  }

  return connection;
};

export const stopConnection = async () => {
  if (connection) {
    await connection.stop();
    console.log('SignalR Disconnected.');
    connection = null;
  }
};

export const onAttractionCreated = (callback) => {
  if (connection) {
    connection.on('OnAttractionCreated', callback);
  }
};

export const onBookingConfirmed = (callback) => {
  if (connection) {
    connection.on('OnBookingConfirmed', callback);
  }
};

export const onPaymentApproved = (callback) => {
  if (connection) {
    connection.on('OnPaymentApproved', callback);
  }
};

export const joinGroup = async (groupId) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('JoinGroup', groupId);
  }
};

export const leaveGroup = async (groupId) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke('LeaveGroup', groupId);
  }
};
