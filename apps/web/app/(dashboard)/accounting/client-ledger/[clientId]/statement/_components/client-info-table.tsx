interface ClientInfoTableProps {
  client?: {
    clientName: string;
    clientCode: string;
    representative?: string | null;
    businessNumber?: string | null;
    businessType?: string | null;
    businessCategory?: string | null;
    address?: string | null;
    addressDetail?: string | null;
  };
}

export function ClientInfoTable({ client }: ClientInfoTableProps) {
  if (!client) return null;

  return (
    <div className="mb-6 border border-gray-300">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="bg-gray-100 px-4 py-2 font-medium w-32 border-r border-gray-300">
              거래처명
            </td>
            <td className="px-4 py-2">{client.clientName}</td>
            <td className="bg-gray-100 px-4 py-2 font-medium w-32 border-l border-gray-300">
              거래처코드
            </td>
            <td className="px-4 py-2">{client.clientCode}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
              대표자
            </td>
            <td className="px-4 py-2">{client.representative || '-'}</td>
            <td className="bg-gray-100 px-4 py-2 font-medium border-l border-gray-300">
              사업자번호
            </td>
            <td className="px-4 py-2">{client.businessNumber || '-'}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
              업태
            </td>
            <td className="px-4 py-2">{client.businessType || '-'}</td>
            <td className="bg-gray-100 px-4 py-2 font-medium border-l border-gray-300">
              업종
            </td>
            <td className="px-4 py-2">{client.businessCategory || '-'}</td>
          </tr>
          <tr>
            <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
              주소
            </td>
            <td className="px-4 py-2" colSpan={3}>
              {client.address || '-'} {client.addressDetail || ''}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
