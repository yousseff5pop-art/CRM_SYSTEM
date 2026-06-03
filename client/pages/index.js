export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/crm-frontend.html",
      permanent: false
    }
  };
}

export default function HomeRedirect() {
  return null;
}
