import { Text } from 'react-native';

interface StatusMessageProps {
  message: string;
}

export default function StatusMessage({ message }: StatusMessageProps) {
  return <Text style={{ color: '#e8e8e8', fontSize: 24 }}>{message}</Text>;
}
