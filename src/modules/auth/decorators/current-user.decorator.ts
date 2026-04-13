import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    if (ctx.getType<'graphql'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(ctx).getContext<{ req?: { user?: AuthenticatedUser } }>();
      return gqlCtx.req?.user;
    }

    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return req.user;
  },
);
