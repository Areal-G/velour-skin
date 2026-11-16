import Link from "next/link";
import { UserIcon } from "@/app/components/ui/Icons";

/**
 * Account entry point in the header. In the demo every visitor is signed in
 * as the demo customer, so it always links to the account page.
 */
export function AccountMenu() {
  return (
    <Link
      href="/account"
      className="site-header-icon relative inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-beige-100"
      aria-label="My account"
      data-testid="account-link"
    >
      <UserIcon className="size-5" />
      <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-success" />
    </Link>
  );
}
